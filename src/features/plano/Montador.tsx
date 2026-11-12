// Montagem simples do protocolo, em passos, portada de design/mock/plano-simples.js (renderSimple).
// Mesma marcação, mesmas classes e mesmos textos do mock. O rascunho fica guardado no aparelho enquanto é montado.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { exportarCsv, importarCsv } from "../../domain/csv.ts";
import { EQUIPAMENTOS } from "../../domain/equipamento.ts";
import { GER } from "../../domain/ger.ts";
import { faixaTxt, juntar } from "../../domain/texto.ts";
import { MUSCULOS, type Faixa, type Protocolo } from "../../domain/tipos.ts";
import { api } from "../../lib/api.ts";
import { FACE } from "../../lib/faces.ts";
import { gravarChave, lerChave } from "../../lib/idb.ts";
import { Gaveta } from "../../components/camadas.tsx";
import { toast } from "../../lib/aviso.ts";
import { ICON } from "../../components/icones.tsx";
import {
  alcance, alertasDaSemana, avisoDeDias, cabe, DIAS, diasDeTreino, doModelo, E, equipamentoTxt, escada,
  fluxo, GERL, GRUPOS, M2, misto, MODELOS, N, nomeDoDia, precisaAviso, resumoDoEx, revisaoDoDia, RRP, setEscada, sincronizarDias, T,
  TIPOS, TSHORT, vazio, type Bib, type Ex, type Item, type Rascunho, type Tipo
} from "../../lib/plano.ts";

interface ItemDaApi { id: string; nome: string; nomePt: string | null; musculo: string; acessorios: string[]; equipamento: Item["equipamento"]; pilhaKg: number | null }
const paraItem = (i: ItemDaApi): Item => ({ nome: i.nomePt || i.nome, musculo: i.musculo, acessorios: i.acessorios, equipamento: i.equipamento, pilhaKg: i.pilhaKg });
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const mapa = (itens: ItemDaApi[]) => Object.fromEntries(itens.map(i => [i.id, paraItem(i)]));

/* Itens da biblioteca usados pelos modelos prontos. */
const IDS_DOS_MODELOS = ["sup", "pux", "dev", "elev", "pul", "scott", "hack", "stiff", "ext", "pants", "supH", "tbar", "pecfly", "crucr", "paral", "leg45", "flex", "extr", "adut", "pantp"];

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const paraProtocolo = (d: Rascunho): Protocolo => ({ agenda: d.agenda, descanso: d.descanso, descansoPreparo: d.descansoPreparo, camada: d.camada, dias: d.dias });
const doProtocolo = (p: Protocolo): Rascunho => ({
  ...vazio(), agenda: p.agenda, descanso: p.descanso, descansoPreparo: p.descansoPreparo, camada: { ...p.camada },
  dias: p.dias.map(x => ({ folga: x.folga, exercicios: x.exercicios.map(e => ({ ...e, uid: crypto.randomUUID(), acessorios: (e.acessorios ?? []).slice() })) }))
});

export interface MontadorProps {
  inicial: Rascunho | null;
  bibInicial: Bib;
  travado: boolean;
  salvar(r: Rascunho, b: Bib): Promise<void>;
}

export function Montador({ inicial, bibInicial, travado, salvar }: MontadorProps) {
  const [d, setD] = useState<Rascunho>(() => inicial ?? vazio());
  const [bib, setBib] = useState<Record<string, Item>>({ ...bibInicial });
  const [passo, setPasso] = useState(0);
  const [importando, setImportando] = useState(false);
  const [pendente, setPendente] = useState<{ r: Rascunho; resumo: string; avisos: string[] } | null>(null);
  const [erroCsv, setErroCsv] = useState("");
  const [colado, setColado] = useState("");
  const [filtro, setFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<{ id: string; item: Item }[] | null>(null);
  const [aberto, setAberto] = useState(-1);
  const [serieAberta, setSerieAberta] = useState(0);
  const [avancado, setAvancado] = useState(false);
  const [dia, setDia] = useState(0);
  const [sessao, setSessao] = useState(0);
  const [desfazer, setDesfazer] = useState<{ sessao: number; dia: number; k: number; e: Ex } | null>(null);
  const [aviso, setAviso] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const rolagem = useRef<HTMLDivElement>(null);
  const timerDesfazer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // O rascunho volta de onde parou, se não veio um protocolo para ajustar.
  useEffect(() => {
    if (inicial) return;
    void lerChave<Rascunho>("rascunho").then(r => { if (r && Array.isArray(r.dias) && r.dias.length === 7) setD(r); }).catch(() => {});
  }, [inicial]);
  useEffect(() => { void gravarChave("rascunho", d).catch(() => {}); }, [d]);

  // Os itens dos modelos prontos vêm de uma vez, para o resumo e os avisos funcionarem.
  useEffect(() => {
    const faltam = IDS_DOS_MODELOS.filter(id => !bib[id]);
    if (!faltam.length) return;
    void api<{ itens: ItemDaApi[] }>("GET", `/biblioteca?ids=${encodeURIComponent(faltam.join(","))}`)
      .then(r => setBib(b => ({ ...b, ...mapa(r.itens) }))).catch(() => {});
  }, [bib]);

  const mudar = (fn: (x: Rascunho) => void) => setD(atual => {
    const x = structuredClone(atual);
    fn(x);
    sincronizarDias(x);
    return x;
  });
  const exs = (x: Rascunho) => x.ciclo ? x.ciclo[Math.min(sessao, x.ciclo.length - 1)]!.exercicios : x.dias[dia]!.exercicios;
  const ir = (p: number) => { setPasso(p); setAberto(-1); rolagem.current?.closest(".screen")?.scrollTo({ top: 0 }); };

  // Busca: grupo muscular e nome, como o showRes do mock (até 8 resultados).
  const buscando = passo === 3 && (!!busca.trim() || !!filtro);
  useEffect(() => {
    const g = GRUPOS.find(x => x[0] === filtro);
    if (passo !== 3 || (!busca.trim() && !g)) return;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ q: busca.trim() });
      if (g) qs.set("musculos", g[1].join(","));
      void api<{ itens: ItemDaApi[] }>("GET", `/biblioteca?${qs}`)
        .then(r => { setBib(b => ({ ...b, ...mapa(r.itens) })); setAchados(r.itens.slice(0, 8).map(i => ({ id: i.id, item: paraItem(i) }))); })
        .catch(() => setAchados([]));
    }, 200);
    return () => clearTimeout(t);
  }, [busca, filtro, passo]);

  const t = diasDeTreino(d);
  const fit = useMemo(() => avisoDeDias(d), [d]);

  if (travado) return (
    <div className="card"><div className="lock">{ICON.cadeado}<h3>Plano travado</h3></div>
      <p className="why">A semana de ajuste acabou e a fase está travada. Ideias de mudança ficam para a próxima fase.</p></div>
  );

  const stepbar = (
    <ol className="stepbar">
      {["Dias", "Se faltar", "Exercícios", "Revisão"].map((nome, i) => (
        <li key={nome}><button aria-current={passo === i + 1 ? "step" : "false"} aria-label={`Passo ${i + 1}: ${nome}`}
          disabled={i + 1 > 1 && !t.length} onClick={() => ir(i + 1)}><b>{i + 1}</b><span>{nome}</span></button></li>
      ))}
    </ol>
  );

  const nav = passo >= 1 && (
    <div className="snav">
      {passo > 1 ? <button className="btn btn-ghost" onClick={() => ir(passo - 1)}>Voltar</button> : <button className="btn btn-ghost" onClick={() => ir(0)}>Início</button>}
      {passo < 4
        ? <button className="btn btn-primary" disabled={passo === 1 && !t.length} onClick={() => { if (passo === 1 && precisaAviso(d)) { setAviso(true); return; } ir(passo + 1); }}>Próximo</button>
        : <button className="btn btn-primary" disabled={salvando} onClick={() => {
            setSalvando(true);
            void salvar(d, bib).then(() => gravarChave("rascunho", null)).catch((e: Error) => toast("Não deu para salvar", e.message, 8)).finally(() => setSalvando(false));
          }}>Salvar protocolo</button>}
    </div>
  );

  let corpo: ReactNode;
  if (passo === 0 && importando) {
    const ler = (texto: string) => {
      const r = importarCsv(texto, bib);
      if (!r.ok) { setPendente(null); setErroCsv(r.erro); return; }
      setErroCsv("");
      setPendente({ r: doProtocolo(r.rascunho), resumo: r.resumo, avisos: r.avisos });
    };
    corpo = <>
      <h3 className="sh">Importar protocolo</h3>
      <p className="why">O arquivo vira um rascunho. Nada muda no seu protocolo até você revisar e salvar.</p>
      <label className="filebtn">Escolher arquivo<input type="file" aria-label="Escolher arquivo CSV" accept=".csv,text/csv" onChange={e => {
        const f = e.target.files?.[0];
        if (!f) return;
        void f.text().then(ler);
        e.target.value = "";
      }} /></label>
      <details><summary className="linkbtn" style={{ display: "inline-flex", alignItems: "center" }}>Ou cole o conteúdo do CSV</summary>
        <div className="col" style={{ gap: 8, marginTop: 8 }}>
          <label className="sr" htmlFor="sCsvPaste">Conteúdo do CSV</label>
          <textarea className="field" id="sCsvPaste" placeholder="semana,dia,descanso_seg,..." value={colado} onChange={e => setColado(e.target.value)} />
          <button className="btn btn-ghost" onClick={() => { if (colado.trim()) ler(colado.trim()); }}>Ler CSV</button>
        </div>
      </details>
      <div>
        {erroCsv && <p className="report w">{erroCsv}</p>}
        {pendente && <ul className="report"><li>{pendente.resumo}</li>{pendente.avisos.map(w => <li key={w} className="w">{w}</li>)}</ul>}
      </div>
      <div className="snav">
        <button className="btn btn-ghost" onClick={() => { setImportando(false); setPendente(null); }}>Voltar</button>
        <button className="btn btn-primary" disabled={!pendente} onClick={() => {
          if (!pendente) return;
          setD(pendente.r); setPendente(null); setImportando(false); ir(4);
          toast("CSV importado", "Ficou como rascunho. Revise e salve para usar.", 10);
        }}>Usar como rascunho</button>
      </div>
    </>;
  } else if (passo === 0) {
    const nE = d.dias.reduce((a, x) => a + (x.folga ? 0 : x.exercicios.length), 0) + (d.ciclo ? d.ciclo.reduce((a, s) => a + s.exercicios.length, 0) : 0);
    corpo = <>
      <h3 className="sh">Como quer começar?</h3>
      {(["ul", "ppl"] as const).map(k => (
        <button key={k} className="pick" onClick={() => { const r = doModelo(k, bib); sincronizarDias(r); setD(r); setSessao(0); setDia(diasDeTreino(r)[0] ?? 0); ir(1); }}>
          <b>{MODELOS[k].nome}</b><span>{MODELOS[k].sub} Baixo volume: poucas séries, bem feitas. O aquecimento entra sozinho antes das séries que valem.</span>
        </button>
      ))}
      <button className="pick" onClick={() => { setD(vazio()); setSessao(0); setDia(0); ir(1); }}><b>Montar do zero</b><span>Você escolhe os dias e cada exercício.</span></button>
      <button className="pick" onClick={() => {
        setImportando(true); setPendente(null); setErroCsv("");
        // O CSV liga cada linha à biblioteca pelo id ou pelo nome: carrega a biblioteca inteira antes de ler.
        void (async () => {
          const todos: ItemDaApi[] = [];
          for (let p = 0; p < 100; p++) {
            const r = await api<{ itens: ItemDaApi[] }>("GET", `/biblioteca?pagina=${p}`);
            todos.push(...r.itens);
            if (r.itens.length < 30) break;
          }
          setBib(b => ({ ...b, ...mapa(todos) }));
        })().catch(() => {});
      }}><b>Importar um CSV</b><span>Alguém montou o protocolo para você? Escolha o arquivo e revise antes de usar.</span></button>
      {nE > 0 && <button className="pick ghost" onClick={() => { setDia(diasDeTreino(d)[0] ?? 0); ir(1); }}><b>Continuar o rascunho</b><span>{t.length} dias de treino e {nE} exercícios já montados.</span></button>}
    </>;
  } else if (passo === 1) {
    corpo = <>
      {stepbar}
      <h3 className="sh">Em quais dias você vai treinar?</h3>
      <p className="why">Toque nos dias de treino. Os outros viram descanso.</p>
      <div className="days sdaypick">
        {d.dias.map((x, i) => (
          <button key={i} className={x.folga ? "off" : ""} aria-pressed={!x.folga} onClick={() => mudar(r => {
            r.dias[i]!.folga = !r.dias[i]!.folga;
            r.camada.metaN = Math.max(1, Math.min(5, diasDeTreino(r).length));
          })}>{DIAS[i]}<small>{x.folga ? "descanso" : "treino"}</small></button>
        ))}
      </div>
      <p className="lead">{t.length ? `${t.length} ${t.length > 1 ? "dias" : "dia"} de treino por semana.` : "Nenhum dia escolhido ainda."}</p>
    </>;
  } else if (passo === 2) {
    const rec = !!d.ciclo && !cabe(d);
    corpo = <>
      {stepbar}
      <h3 className="sh">E se você faltar um dia?</h3>
      <button className="pick" aria-pressed={d.agenda === "semana"} onClick={() => mudar(r => { r.agenda = "semana"; })}>
        <b>Pulo aquele treino</b><span>Cada treino fica no seu dia. Faltou na terça: na quinta você faz o treino de quinta.</span>
      </button>
      <button className="pick" aria-pressed={d.agenda === "sequencia"} onClick={() => mudar(r => { r.agenda = "sequencia"; })}>
        <b>Faço o que ficou para trás</b><span>Os treinos seguem uma fila. Faltou na terça: na quinta você faz o de terça, e o resto anda uma casa.</span>
        {rec && <em className="tag">Recomendado para os dias que você marcou</em>}
      </button>
    </>;
  } else if (passo === 3) {
    const c = d.ciclo;
    const sAtual = c ? Math.min(sessao, c.length - 1) : 0;
    const diaAtual = c ? dia : (t.includes(dia) ? dia : t[0] ?? 0);
    const lista = c ? c[sAtual]!.exercicios : d.dias[diaAtual]!.exercicios;
    const cabecalho = c ? c[sAtual]!.nome : nomeDoDia(d, diaAtual);
    const abas = c
      ? c.map((s, i) => { const ds = t.filter((_, k) => k % c.length === i).map(x => DIAS[x]!.toLowerCase()); return (
          <button key={i} aria-selected={i === sAtual} onClick={() => { setSessao(i); setAberto(-1); setDesfazer(null); }}>{s.nome}<small>{ds.length ? juntar(ds) : "semana seguinte"}</small></button>); })
      : t.map(i => <button key={i} aria-selected={i === diaAtual} onClick={() => { setDia(i); setAberto(-1); setDesfazer(null); }}>{DIAS[i]}<small>{d.dias[i]!.exercicios.length} ex.</small></button>);
    corpo = <>
      {stepbar}
      <div className="sdays" role="tablist" aria-label={cabecalho}>{abas}</div>
      {desfazer && <div className="undo"><span>{bib[desfazer.e.id]?.nome ?? "Exercício"} saiu do treino.</span><button onClick={() => {
        mudar(r => { const to = r.ciclo ? r.ciclo[desfazer.sessao]!.exercicios : r.dias[desfazer.dia]!.exercicios; to.splice(desfazer.k, 0, desfazer.e); });
        setSessao(desfazer.sessao); setDia(desfazer.dia); setAberto(desfazer.k); setDesfazer(null); clearTimeout(timerDesfazer.current);
      }}>Desfazer</button></div>}
      {lista.length
        ? <ol className="blist" id="sList">{lista.map((e, k) => (
            <LinhaDoEx key={e.uid} d={d} lista={lista} k={k} bib={bib} aberto={aberto === k} serieAberta={serieAberta} avancado={avancado}
              abrir={() => { setSerieAberta(0); setAvancado(false); setAberto(aberto === k ? -1 : k); }}
              setSerieAberta={setSerieAberta} setAvancado={setAvancado}
              mudarEx={fn => mudar(r => { fn(exs(r)[k]!, r); })}
              mover={para => mudar(r => { const a = exs(r); if (para < 0 || para >= a.length) return; const [it] = a.splice(k, 1); a.splice(para, 0, it!); })}
              remover={() => {
                clearTimeout(timerDesfazer.current);
                setDesfazer({ sessao: sAtual, dia: diaAtual, k, e: structuredClone(lista[k]!) });
                timerDesfazer.current = setTimeout(() => setDesfazer(null), 6000);
                mudar(r => { exs(r).splice(k, 1); });
                setAberto(-1);
              }} />
          ))}</ol>
        : <p className="why">Nenhum exercício neste treino ainda. Escolha abaixo.</p>}
      <div className="sadd">
        <span className="lbl">Adicionar exercício</span>
        <div className="chips">{GRUPOS.map(([g]) => <button key={g} aria-pressed={filtro === g} onClick={() => setFiltro(filtro === g ? "" : g)}>{g}</button>)}</div>
        <label className="sr" htmlFor="sSearch">Buscar exercício</label>
        <input className="field" id="sSearch" placeholder="Ou busque pelo nome" autoComplete="off" value={busca} onChange={e => setBusca(e.target.value)} />
        <ul className="results" id="sRes">
          {buscando && achados && (achados.length
            ? achados.map(({ id, item }) => <li key={id}><button onClick={() => {
                mudar(r => { exs(r).push(E(bib, id, M2())); });
                setAberto(lista.length); setSerieAberta(0); setFiltro(""); setBusca("");
              }}>{item.nome}<small>{cap(item.musculo)} · {EQUIPAMENTOS[item.equipamento].nome}</small></button></li>)
            : <li className="why" style={{ padding: "8px 0" }}>Nada na biblioteca com esse nome.</li>)}
        </ul>
      </div>
    </>;
  } else {
    const al = alertasDaSemana(d, bib);
    corpo = <>
      {stepbar}
      <h3 className="sh">Revisão</h3>
      {d.ciclo && d.agenda === "sequencia" && <p className="why">Esta é a primeira semana. Como os treinos seguem em fila, a semana seguinte continua de onde esta parou.</p>}
      {t.map(i => {
        const r = revisaoDoDia(d, i, bib);
        return <div className="rvday" key={i}><div><b>{nomeDoDia(d, i)}</b><small>{r.n} {r.n === 1 ? "exercício" : "exercícios"} · {r.series} {r.series === 1 ? "série válida" : "séries válidas"} e {r.preparos} de preparo · cerca de {r.min} min, contando o aquecimento</small></div></div>;
      })}
      <div className="report">{al.length
        ? <><b>Vale olhar antes de salvar</b><ul>{al.map(a => <li key={a} className="w">{a}</li>)}</ul></>
        : <><b>Tudo certo.</b> Todos os grupos musculares aparecem na semana, nenhuma parte do corpo treina em dias seguidos e nenhum dia passa de 60 minutos.</>}</div>
      <div className="rvexp">
        <button className="btn btn-ghost" onClick={() => { baixar("protocolo_overload.csv", exportarCsv(paraProtocolo(d), bib)); toast("CSV exportado", "Quem receber o arquivo importa no Plano da própria conta.", 10); }}>Exportar CSV</button>
        <p className="why">Para mandar o protocolo para alguém: a pessoa importa o arquivo no Plano da própria conta.</p>
      </div>
      <details className="card" open={false}><summary><h3>Configurações do protocolo</h3></summary><p>Já vêm prontas. Só mude se souber o que quer.</p>
        <Configuracoes d={d} mudar={mudar} />
      </details>
    </>;
  }

  return (
    <div id="bSimple" className="col" ref={rolagem}>
      {corpo}
      {nav}
      <Gaveta titulo={fit?.titulo ?? ""} aberta={aviso && !!fit} fechar={() => setAviso(false)}>
        {fit && <div className="fitw" role="status">
          <b>{fit.cabecalho}</b><p>{fit.porque}</p>
          {fit.semDescanso && <p>Com os 7 dias marcados, não sobra nenhum dia de descanso na semana. Vale deixar pelo menos um.</p>}
          <p><b>{fit.fila.split("|")[0]}</b> {fit.fila.split("|")[1]}</p>
          <ul className="fitl">{fit.filaLista.map((x, i) => <li key={i}><span>{x.dia}</span>{x.nome}</li>)}<li className="nx">{fit.proxima}</li></ul>
          {fit.fixo && <p>{fit.fixo}</p>}
          <div className="acts">
            {d.agenda === "semana" && <button className="btn btn-primary" onClick={() => { mudar(r => { r.agenda = "sequencia"; }); setAviso(false); ir(2); setTimeout(() => ir(3), 900); }}>Usar a fila</button>}
            {fit.mascara && fit.rotuloMascara && <button className="btn btn-ghost" onClick={() => { const m = fit.mascara!; mudar(r => { r.dias.forEach((x, i) => { x.folga = !m[i]; }); r.camada.metaN = Math.max(1, Math.min(5, diasDeTreino(r).length)); }); setAviso(false); }}>{fit.rotuloMascara}</button>}
            {fit.trocarParaPpl && <button className="btn btn-ghost" onClick={() => { const m = d.dias.map(x => !x.folga); const r = doModelo("ppl", bib, m); sincronizarDias(r); setD(r); setSessao(0); setAviso(false); }}>Trocar para Empurrar, puxar e pernas</button>}
            <button className="linkbtn" onClick={() => { setAviso(false); ir(2); }}>Seguir com estes dias</button>
          </div>
        </div>}
      </Gaveta>
    </div>
  );
}

/* Linha do exercício e o editor que abre nela (sExRow do mock). */
function LinhaDoEx(p: {
  d: Rascunho; lista: Ex[]; k: number; bib: Bib; aberto: boolean; serieAberta: number; avancado: boolean;
  abrir(): void; setSerieAberta(n: number): void; setAvancado(v: boolean): void;
  mudarEx(fn: (e: Ex, r: Rascunho) => void): void; mover(para: number): void; remover(): void;
}) {
  const { d, lista, k, bib } = p, e = lista[k]!, L = bib[e.id];
  const nome = L?.nome ?? e.id;
  const res = resumoDoEx(d, lista, k, bib);
  return (
    <li className="bex">
      <div className="hd">
        <button className="grip" aria-label={`Mover ${nome}. Setas do teclado também movem.`}
          onKeyDown={ev => { if (ev.key === "ArrowUp" || ev.key === "ArrowDown") { ev.preventDefault(); p.mover(k + (ev.key === "ArrowUp" ? -1 : 1)); } }}>{ICON.grip}</button>
        <button className="nm" aria-expanded={p.aberto} onClick={p.abrir}><b>{nome}</b>
          <small><span className="sdots" aria-hidden="true">{Array.from({ length: res.preparo }, (_, i) => <i key={`w${i}`} className="w" />)}{Array.from({ length: res.validas }, (_, i) => <i key={i} />)}</span>{res.texto}</small>
        </button>
        <button className="x sdel" aria-label={`Remover ${nome}`} onClick={p.remover}>{ICON.x}</button>
      </div>
      {p.aberto && L && <Editor {...p} e={e} L={L} />}
    </li>
  );
}

function Editor(p: Parameters<typeof LinhaDoEx>[0] & { e: Ex; L: Item }) {
  const { d, lista, k, bib, e, L } = p;
  const mix = misto(e), sc = alcance(e, p.serieAberta), s0 = e.series[sc[0]!]!, many = e.series.length > 1;
  const which = mix ? ` na série ${sc[0]! + 1}` : many ? " por série" : "";
  const fx = fluxo(d, lista, k, bib);
  const pre = s0.tipo === "NORMAL" && !RRP.some(x => x.rr[0] === s0.faixa[0] && x.rr[1] === s0.faixa[1])
    ? [...RRP, { rr: s0.faixa as Faixa, t: "Do protocolo", s: faixaTxt(s0.faixa) }] : RRP;
  return (
    <div className="sed">
      <div className="grp"><span className="lbl">Como fica no treino</span>
        <ol className="flow">
          {fx.preparos.map((x, i) => <li key={`p${i}`} className="w"><b>Preparo</b><span>{x}</span></li>)}
          {fx.series.map((x, j) => <li key={j}><b>Série {j + 1}</b><span>{x}</span></li>)}
        </ol>
        <p className="why">{fx.porque}</p>
      </div>
      <div className="srow2"><span className="lbl">Quantas séries</span>
        <div className="stepper mini" role="group" aria-label="Quantas séries">
          <button aria-label="Menos uma série" disabled={!many} onClick={() => p.mudarEx(x => {
            if (x.series.length < 2) return;
            const lad = escada(x); x.series.pop();
            const a = x.series[0]!;
            if (lad && a.tipo === "NORMAL") setEscada(x, a.ger, x.series.length > 1);
            p.setSerieAberta(Math.min(p.serieAberta, x.series.length - 1));
          })}>{ICON.minus}</button>
          <div className="val"><b className="num">{e.series.length}</b></div>
          <button aria-label="Mais uma série" onClick={() => p.mudarEx(x => {
            const lad = escada(x); x.series.push({ ...x.series[x.series.length - 1]! });
            const a = x.series[0]!;
            if (lad && a.tipo === "NORMAL") setEscada(x, a.ger, true);
            if (misto(x)) p.setSerieAberta(x.series.length - 1);
          })}>{ICON.plus}</button>
        </div>
      </div>
      {many && <div className="grp"><div className="seg2" role="group" aria-label="Como são as séries">
        <button aria-pressed={!mix} onClick={() => p.mudarEx(x => { const src = x.series[Math.min(p.serieAberta, x.series.length - 1)]!; x.series = x.series.map(() => ({ ...src })); x.misto = false; })}>Todas iguais</button>
        <button aria-pressed={mix} onClick={() => { p.mudarEx(x => { x.misto = true; }); p.setSerieAberta(0); }}>Cada série de um jeito</button>
      </div></div>}
      {mix && <div className="stabs" role="tablist" aria-label="Séries">{e.series.map((s, j) => (
        <button key={j} role="tab" aria-selected={j === sc[0]} onClick={() => p.setSerieAberta(j)}><b>Série {j + 1}</b><small>{s.tipo === "NORMAL" ? faixaTxt(s.faixa) : TIPOS[s.tipo].label}</small></button>
      ))}</div>}
      {s0.tipo === "NORMAL" ? <>
        <div className="grp"><span className="lbl">Repetições{which}</span>
          <div className="rrp" style={{ gridTemplateColumns: `repeat(${pre.length},1fr)` }}>
            {pre.map(x => <button key={x.s + x.t} aria-pressed={s0.faixa[0] === x.rr[0] && s0.faixa[1] === x.rr[1]}
              onClick={() => p.mudarEx(y => { alcance(y, p.serieAberta).forEach(j => { const z = y.series[j]!; if (z.tipo === "NORMAL") z.faixa = [x.rr[0], x.rr[1]]; }); })}><b>{x.s}</b><small>{x.t}</small></button>)}
          </div>
        </div>
        <div className="grp"><span className="lbl">Quanto deixar na reserva{which}</span>
          <div className="sobra">{[7, 8, 9, 10].map(g => (
            <button key={g} aria-pressed={s0.ger === g} aria-label={GER[g]!.alvo} onClick={() => p.mudarEx(y => {
              if (!misto(y)) setEscada(y, g, escada(y));
              else alcance(y, p.serieAberta).forEach(j => { const z = y.series[j]!; if (z.tipo === "NORMAL") z.ger = g; });
            })}><span className="fslot"><img className="face" src={FACE[g]} width={24} height={37} alt="" /></span><small>{GERL[g]}</small></button>
          ))}</div>
          {!mix && many && s0.ger < 10 && <button className="switch" role="switch" aria-checked={escada(e)} onClick={() => p.mudarEx(y => { const a = y.series[0]!; if (a.tipo === "NORMAL") setEscada(y, a.ger, !escada(y)); })}>
            <span className="kn" />Última série com {GER[s0.ger + 1]!.alvo.toLowerCase()}</button>}
        </div>
      </> : <div className="report"><b>{TIPOS[s0.tipo].label}{mix ? ` na série ${sc[0]! + 1}` : ""}.</b> {TIPOS[s0.tipo].desc}</div>}
      <details className="advx" open={p.avancado} onToggle={ev => p.setAvancado((ev.target as HTMLDetailsElement).open)}>
        <summary>Opções avançadas</summary>
        <span className="lbl">Tipo {mix ? `da série ${sc[0]! + 1}` : many ? "das séries" : "da série"}</span>
        <div className="rrp tps">{(["NORMAL", "REST_PAUSE", "MUSCLE_ROUND"] as Tipo[]).map(tp => (
          <button key={tp} aria-pressed={s0.tipo === tp} onClick={() => p.mudarEx(y => {
            const mixed = misto(y);
            alcance(y, p.serieAberta).forEach(j => { if (y.series[j]!.tipo !== tp) y.series[j] = tp === "NORMAL" ? N(8, [8, 10]) : T(tp); });
            if (mixed) y.misto = true;
          })}><b>{TIPOS[tp].label}</b><small>{TSHORT[tp]}</small></button>
        ))}</div>
        <div className="bed">
          <div className="brest">
            <label>Descanso entre séries<select value={e.descanso ?? ""} onChange={ev => p.mudarEx(y => { y.descanso = ev.target.value ? +ev.target.value : null; })}>
              <option value="">Padrão ({d.descanso} s)</option>{[60, 90, 120, 150, 180].map(v => <option key={v} value={v}>{v} s</option>)}</select></label>
            <label>Descanso no preparo<select value={e.descansoPreparo ?? ""} onChange={ev => p.mudarEx(y => { y.descansoPreparo = ev.target.value ? +ev.target.value : null; })}>
              <option value="">Padrão ({d.descansoPreparo} s)</option>{[30, 40, 60].map(v => <option key={v} value={v}>{v} s</option>)}</select></label>
          </div>
          <label className="lblsel">Séries de preparo<select value={fx.info.travado ? String(fx.info.n) : "auto"} onChange={ev => p.mudarEx(y => { y.preparo = ev.target.value === "auto" ? "auto" : +ev.target.value as 0 | 1 | 2 | 3; })}>
            <option value="auto">Automático ({fx.info.automatico})</option>{[0, 1, 2, 3].map(n => <option key={n} value={n}>Travar em {n}</option>)}</select></label>
          <p className="why">{fx.info.porque}</p>
          <span className="lbl">Músculos acessórios</span>
          <div className="chips">{MUSCULOS.filter(m => m !== L.musculo).map(m => (
            <button key={m} aria-pressed={e.acessorios.includes(m)} onClick={() => p.mudarEx(y => { const i = y.acessorios.indexOf(m); if (i >= 0) y.acessorios.splice(i, 1); else y.acessorios.push(m); })}>{cap(m)}</button>
          ))}</div>
          <p className="why">{equipamentoTxt(L)}</p>
        </div>
      </details>
    </div>
  );
}

/* Descansos padrão e camada de aderência (os dois details do mock que vão para a revisão). */
function Configuracoes({ d, mudar }: { d: Rascunho; mudar(fn: (x: Rascunho) => void): void }) {
  const ly = d.camada;
  const chave = (l: "fase" | "meta" | "nuncaDuas", texto: string) => (
    <button className="switch" role="switch" aria-checked={!!ly[l]} onClick={() => mudar(r => { r.camada[l] = !r.camada[l]; })}><span className="kn" />{texto}</button>
  );
  return <>
    <details className="card" open><summary><h3>Descansos padrão</h3></summary>
      <p>Valem para todo exercício que não tiver o próprio descanso.</p>
      <div className="brest">
        <label>Entre séries<select value={d.descanso} onChange={e => mudar(r => { r.descanso = +e.target.value; })}>{[60, 90, 120, 150, 180].map(v => <option key={v} value={v}>{v} s</option>)}</select></label>
        <label>No preparo<select value={d.descansoPreparo} onChange={e => mudar(r => { r.descansoPreparo = +e.target.value; })}>{[30, 40, 60].map(v => <option key={v} value={v}>{v} s</option>)}</select></label>
      </div>
    </details>
    <details className="card" open><summary><h3>Camada de aderência</h3></summary>
      <p>Opcional. Ligue o que fizer sentido para o objetivo deste protocolo.</p>
      <div className="layer">
        {chave("fase", "Fase com plano travado e lista de ideias")}
        <div className="sub"><span>Duração da fase</span><select aria-label="Duração da fase" disabled={!ly.fase} value={ly.semanas} onChange={e => mudar(r => { r.camada.semanas = +e.target.value; })}>{[4, 6, 8].map(v => <option key={v} value={v}>{v} semanas</option>)}</select></div>
        {chave("meta", "Meta semanal de sessões")}
        <div className="sub"><span>Sessões por semana</span><select aria-label="Sessões por semana" disabled={!ly.meta} value={ly.metaN} onChange={e => mudar(r => { r.camada.metaN = +e.target.value; })}>{[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
        {chave("nuncaDuas", "Nunca faltar duas vezes")}
      </div>
    </details>
  </>;
}


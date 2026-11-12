// Um cartão do reel (design/mock/sessao.js: card e cardH). O cartão ativo tem o 3D, os controles do passo e os botões,
// que vão para o pé do reel (.actslot) para o cartão não mudar de altura quando o descanso abre.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { arredondar, EQUIPAMENTOS, unidade } from "../../domain/equipamento.ts";
import { GER } from "../../domain/ger.ts";
import { RAMPAS } from "../../domain/preparo.ts";
import { perguntaDeCarga } from "../../domain/progressao.ts";
import { faixaDaSerie, kgDoPasso, kgDoPreparo, primeiroNumero, resumoDoPasso, subtituloDoPasso, TIPO_TXT, type EstadoDaSessao, type ResultadoDoPasso } from "../../domain/sessao.ts";
import { fmt } from "../../domain/texto.ts";
import { ICON } from "../../components/icones.tsx";
import { Palco } from "../../components/Palco.tsx";
import { Pix } from "../../components/pix.tsx";
import { FACE } from "../../lib/faces.ts";

export type Modo = "live" | "edit" | "fut";
const up1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const numero = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };
const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const Face = ({ g, w = 40 }: { g: number; w?: number }) =>
  <span className="fslot"><img className="face" src={FACE[g]} width={w} height={Math.round(w * 37.2 / 24)} alt="" /></span>;

function Linha({ g, rotulo, sub, prep }: { g: number; rotulo: string; sub: string; prep?: boolean }) {
  return <div className={`gerline${prep ? " prep" : ""}`}><Face g={g} /><div><div className="t1">{GER[g]!.titulo}</div><div className="t2">{rotulo}</div><div className="t3">{sub}</div></div></div>;
}

function Stepper({ valor, unid, rotulo, dec, passo, digitar, confirmar }: {
  valor: number; unid: string; rotulo: string; dec?: boolean; passo(d: 1 | -1): void; digitar(n: number): void; confirmar?(): void;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado = texto ?? (dec ? fmt(valor) : String(valor));
  return (
    <div className="stepper" role="group" aria-label={rotulo}>
      <button aria-label={`Diminuir ${rotulo.toLowerCase()}`} onClick={() => passo(-1)}>{ICON.minus}</button>
      <label className="val">
        <input value={mostrado} inputMode={dec ? "decimal" : "numeric"} pattern={dec ? undefined : "[0-9]*"} autoComplete="off" enterKeyHint="done"
          onFocus={() => setTexto(mostrado)}
          onChange={e => { setTexto(e.target.value); const n = numero(e.target.value); if (n != null) digitar(n); }}
          onBlur={() => { setTexto(null); confirmar?.(); }}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        <small>{unid}</small><span className="sr">{rotulo}</span>
      </label>
      <button aria-label={`Aumentar ${rotulo.toLowerCase()}`} onClick={() => passo(1)}>{ICON.plus}</button>
    </div>
  );
}

function Pausa({ seg, acabou }: { seg: number; acabou(): void }) {
  const [resta, setResta] = useState(seg);
  const fim = useRef(acabou);
  useEffect(() => { fim.current = acabou; });
  useEffect(() => {
    const t = setInterval(() => setResta(r => { if (r <= 1) { clearInterval(t); setTimeout(() => fim.current(), 0); return 0; } return r - 1; }), 1000);
    return () => clearInterval(t);
  }, []);
  return <div className="itimer" role="timer"><div className="trk"><i style={{ width: `${resta / seg * 100}%` }} /></div><b className="num">{resta}</b></div>;
}

/* O salto de carga: o número velho estoura e o novo aparece (armas.js: blastKg, sem a arma). */
function Salto({ de, para, u }: { de: number; para: number; u: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [estourou, setEstourou] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setEstourou(true);
      const kj = el.current, velho = kj?.querySelector("s");
      if (!kj || !velho || reduzido()) return;
      const r = velho.getBoundingClientRect(), kr = kj.getBoundingClientRect();
      for (let q = 0; q < 12; q++) {
        const b = document.createElement("i");
        b.className = "shard";
        b.style.cssText = `left:${r.left - kr.left + Math.random() * r.width}px;top:${r.top - kr.top + Math.random() * r.height}px`;
        kj.appendChild(b);
        const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 30;
        b.animate([{ transform: "translate(0,0) rotate(0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 20}px) rotate(${(Math.random() - .5) * 180}deg)`, opacity: 0 }], { duration: 520, easing: "steps(8,end)", fill: "forwards" });
      }
    }, 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div ref={el} className={`kgjump ${estourou ? "blown" : "armed"}`} aria-label={`Carga sobe de ${fmt(de)} para ${fmt(para)} ${u}`}>
      <s>{fmt(de)}</s><span className="arr"><Pix nome="up" w={24} /></span><b>{fmt(para)}<small>{u}</small></b>
    </div>
  );
}

interface Props {
  s: EstadoDaSessao; i: number; modo: Modo; travado: boolean; slot: HTMLElement | null;
  concluir(r: ResultadoDoPasso): void; corrigir(r: ResultadoDoPasso): void;
  info(id: string): void; ger(alvo: number, atual: number, escolher: (g: number) => void): void;
}

function Cabeca({ s, i, sub, info }: { s: EstadoDaSessao; i: number; sub: string; info?(id: string): void }) {
  const e = s.lista[s.passos[i]!.k]!;
  return (
    <div className="rc-hd">
      <div><h3>{e.nome}</h3><span className="sub">{sub}</span></div>
      <button className="infobtn" aria-label={`Como fazer ${e.nome}`} tabIndex={info ? 0 : -1} onClick={() => info?.(e.id)}>{ICON.info}</button>
    </div>
  );
}

/* Cartão fechado: vizinho no reel, com o resumo do passo. */
export function CartaoFechado({ s, i, modo, descansando }: { s: EstadoDaSessao; i: number; modo: Modo; descansando: boolean }) {
  const p = s.passos[i]!, e = s.lista[p.k]!;
  const kg = s.res[i] && (s.res[i] as { kg?: number }).kg != null ? kgDoPasso(s, i) : p.tipo === "PREPARO" ? kgDoPreparo(s, p.k, p.fracao) : s.wk[p.k]!.kg;
  return (
    <article className={`rcard${p.tipo === "PREPARO" ? " prep" : ""}`} data-i={i} aria-hidden="true">
      <Cabeca s={s} i={i} sub={subtituloDoPasso(s, i)} />
      <div className="stage"><div className="load"><span className="kg">{fmt(kg)}</span><span className="u">{unidade(e.treino.equipamento)}</span></div></div>
      {modo === "fut"
        ? <div className="rc-lock">{ICON.lock} Bloqueado</div>
        : <div className="rc-sum"><span>{modo === "live" ? (descansando ? "Em descanso" : "Passo atual") : "Feito"}</span><b>{resumoDoPasso(s, i) || "—"}</b></div>}
    </article>
  );
}

/* Cartão ativo. */
export function CartaoAtivo({ s, i, modo, travado, slot, concluir, corrigir, info, ger }: Props) {
  const p = s.passos[i]!, e = s.lista[p.k]!, w = s.wk[p.k]!, eq = e.treino.equipamento, u = unidade(eq), E = EQUIPAMENTOS[eq];
  const salvo = s.res[i] as Record<string, number | undefined> | undefined;
  const vivo = modo !== "edit";
  const fim = (r: ResultadoDoPasso) => modo === "live" ? concluir(r) : modo === "edit" ? corrigir(r) : undefined;
  const passoKg = (v: number, d: 1 | -1) => Math.max(E.base || E.passo, Math.round((v + d * E.passo) * 100) / 100);
  const btn = (txt: string, cls = "btn-primary", act: () => void = () => {}) =>
    <button className={`btn ${cls}`} onClick={act}>{vivo ? txt : "Salvar correção"}</button>;

  // Rascunho do passo: o que está nos controles antes de concluir.
  const metas = w.cartao.metas, alvo = p.tipo === "TRABALHO" ? metas[p.j] : undefined;
  const [kg, setKg] = useState<number>(salvo?.kg ?? (p.tipo === "PREPARO" ? kgDoPreparo(s, p.k, p.fracao) : w.kg));
  const [ajustar, setAjustar] = useState(modo === "edit" || w.cartao.modo === "pergunta");
  const z = p.tipo === "TRABALHO" ? p.serie : null;
  const [reps, setReps] = useState<number>(salvo?.reps ?? (p.tipo === "PREPARO" ? primeiroNumero(p.faixa) : alvo?.reps ?? (z?.tipo === "NORMAL" ? Math.round((z.faixa[0] + z.faixa[1]) / 2) : 0)));
  const [g, setG] = useState<number>(salvo?.ger ?? (z?.tipo === "NORMAL" ? z.ger : 10));
  const [fase, setFase] = useState<string>(salvo ? "edit" : z?.tipo === "REST_PAUSE" ? "b1" : "go");
  const [b1, setB1] = useState(salvo?.b1 ?? alvo?.b1 ?? 8);
  const [b2, setB2] = useState(salvo?.b2 ?? 3);
  const [feitos, setFeitos] = useState(0);
  const [ultimo, setUltimo] = useState(salvo?.ultimo ?? alvo?.ultimo ?? 5);
  const [falha, setFalha] = useState(2);
  const [parou, setParou] = useState(salvo?.blocos != null ? (salvo.blocos >= 6 ? 6 : salvo.blocos + 1) : 6);

  const kgVista = p.tipo === "CALIBRACAO" ? (ajustar ? kg : w.cartao.kg) : p.tipo === "PREPARO" ? kg : kgDoPasso(s, i);
  let corpo: ReactNode = null, acoes: ReactNode = null, sub = subtituloDoPasso(s, i);

  if (p.tipo === "CALIBRACAO") {
    const c = w.cartao;
    const nPrep = s.passos.find(x => x.k === p.k && x.tipo === "PREPARO");
    const rampa = RAMPAS[nPrep && nPrep.tipo === "PREPARO" ? nPrep.n : 0]!;
    const base = ajustar ? kg : c.kg;
    const linha = (
      <div className="planrow"><ol className="rampline">
        {rampa.map(([f, faixa], j) => <li key={"p" + j}><small>{Math.round(f * 100)}%</small>{fmt(arredondar(base * f, eq))} × {faixa.replace(" a ", "-")}</li>)}
        {e.treino.series.map((x, j) => <li key={"s" + j} className="w"><small>S{j + 1}</small>{x.tipo === "NORMAL" ? `${fmt(base)} × ${x.faixa.join("-")}` : TIPO_TXT[x.tipo].toLowerCase()}</li>)}
      </ol></div>
    );
    if (!ajustar) {
      corpo = <>
        <div className={`sug ${c.modo}`}><Face g={c.face ?? 10} /><div><h4>{c.titulo}</h4><p>{c.texto}</p></div></div>
        {c.modo === "up" && modo === "live" && e.ultimo && <Salto de={e.ultimo.kg} para={c.kg} u={u} />}
        {linha}
      </>;
      acoes = <div className="okrow"><button className="btn btn-ghost" onClick={() => { setKg(c.kg); setAjustar(true); }}>Ajustar</button><button className="btn btn-primary okbtn" onClick={() => fim({ kg: c.kg })}>Ok!</button></div>;
    } else {
      const pergunta = c.modo === "pergunta" || modo === "edit";
      corpo = <>
        {pergunta ? <p className="qbox">{perguntaDeCarga(e.treino.series[0]!)}</p> : <p className="lastrec">Sugestão de hoje: {fmt(c.kg)} {u}. Ajuste se a academia não tiver essa carga.</p>}
        <Stepper valor={kg} unid={u} rotulo="Carga de trabalho" dec passo={d => setKg(passoKg(kg, d))} digitar={n => { if (n > 0) setKg(n); }} confirmar={() => setKg(arredondar(kg, eq))} />
        {linha}
      </>;
      const confirmar = btn("Confirmar carga", "btn-primary", () => fim({ kg: arredondar(kg, eq) }));
      acoes = !pergunta ? <div className="okrow"><button className="btn btn-ghost" onClick={() => { setAjustar(false); setKg(c.kg); }}>Voltar</button>{confirmar}</div> : confirmar;
    }
  } else if (p.tipo === "PREPARO") {
    corpo = <>
      <Linha g={7} rotulo={`${p.faixa} repetições`} sub={GER[7]!.alvo} prep />
      <div className="two">
        <Stepper valor={kg} unid={u} rotulo="Carga" dec passo={d => setKg(passoKg(kg, d))} digitar={n => { if (n > 0) setKg(n); }} confirmar={() => setKg(arredondar(kg, eq))} />
        <Stepper valor={reps} unid="reps feitas" rotulo="Repetições" passo={d => setReps(Math.max(0, Math.min(40, reps + d)))} digitar={n => setReps(Math.max(0, Math.min(40, Math.round(n))))} />
      </div>
    </>;
    acoes = btn("Concluir preparo", "btn-prep", () => fim({ kg: arredondar(kg, eq), reps }));
  } else if (z?.tipo === "NORMAL") {
    corpo = <>
      <Linha g={z.ger} rotulo={`${faixaDaSerie(z)} repetições`} sub={GER[z.ger]!.alvo} />
      <Stepper valor={reps} unid="reps feitas" rotulo="Repetições" passo={d => setReps(Math.max(0, Math.min(40, reps + d)))} digitar={n => setReps(Math.max(0, Math.min(40, Math.round(n))))} />
      <button className="gersel" aria-haspopup="dialog" onClick={() => ger(z.ger, g, setG)}>
        <span><small>Quanto sobrou?</small><b>{up1(GER[g]!.sobrou)}</b></span><Pix nome="down" w={16} className="chev" />
      </button>
    </>;
    acoes = btn("Concluir série", "btn-primary", () => fim({ reps, ger: g }));
  } else if (z?.tipo === "REST_PAUSE") {
    const subRp = fase === "b1" ? "Bloco 1 até a falha" : fase === "pausa" ? "Pausa de 20 segundos" : fase === "b2" ? "Bloco 2 até a falha" : "Corrigir os dois blocos";
    const cab = <Linha g={12} rotulo="Rest-pause" sub={subRp} />;
    const st1 = (un: string) => <Stepper valor={b1} unid={un} rotulo="Repetições do bloco 1" passo={d => setB1(Math.max(0, b1 + d))} digitar={n => setB1(Math.max(0, Math.min(40, Math.round(n))))} />;
    const st2 = (un: string) => <Stepper valor={b2} unid={un} rotulo="Repetições do bloco 2" passo={d => setB2(Math.max(0, b2 + d))} digitar={n => setB2(Math.max(0, Math.min(40, Math.round(n))))} />;
    if (fase === "b1") { corpo = <>{cab}{st1("reps no bloco 1")}</>; acoes = <button className="btn btn-primary" onClick={() => { if (b1 > 0) setFase("pausa"); }}>Fim do bloco 1</button>; }
    else if (fase === "pausa") { corpo = <>{cab}<Pausa seg={20} acabou={() => setFase("b2")} /></>; acoes = <button className="btn btn-ghost" onClick={() => setFase("b2")}>Pular pausa</button>; }
    else if (fase === "b2") { corpo = <>{cab}{st2("reps no bloco 2")}</>; acoes = btn("Concluir série", "btn-primary", () => { if (b2 > 0) fim({ b1, b2 }); }); }
    else { corpo = <>{cab}<div className="two">{st1("bloco 1")}{st2("bloco 2")}</div></>; acoes = btn("", "btn-primary", () => fim({ b1, b2 })); }
  } else if (z?.tipo === "MUSCLE_ROUND") {
    const cab = (t: string) => <Linha g={11} rotulo="Muscle round" sub={t} />;
    if (fase === "edit") {
      corpo = <>
        {cab("Corrigir onde parou")}
        <div className="blocks" aria-hidden="true">{Array.from({ length: 6 }, (_, j) => <i key={j} className={j < parou - 1 ? "done" : j === parou - 1 ? (parou === 6 && ultimo > 3 ? "done" : "fail") : ""}>{j + 1}</i>)}</div>
        <div className="two">
          <Stepper valor={parou} unid="bloco onde parou" rotulo="Bloco onde parou" passo={d => setParou(Math.max(1, Math.min(6, parou + d)))} digitar={n => setParou(Math.max(1, Math.min(6, Math.round(n))))} />
          <Stepper valor={ultimo} unid="reps nesse bloco" rotulo="Repetições nesse bloco" passo={d => setUltimo(Math.max(0, ultimo + d))} digitar={n => setUltimo(Math.max(0, Math.min(40, Math.round(n))))} />
        </div>
      </>;
      acoes = btn("", "btn-primary", () => fim(parou === 6 ? { blocos: 6, ultimo } : { blocos: parou - 1, ultimo: Math.min(3, ultimo) }));
    } else {
      const grade = <div className="blocks" aria-label="Blocos">{Array.from({ length: 6 }, (_, j) => <i key={j} className={j < feitos ? "done" : j === feitos ? (fase === "fail" ? "fail" : "now") : ""}>{j + 1}</i>)}</div>;
      const t = fase === "pausa" ? "Pausa de 10 segundos" : fase === "fail" ? `Falhou no bloco ${feitos + 1}` : fase === "final" ? "Bloco 6 de 6, até a falha" : `Bloco ${feitos + 1} de 6, 4 repetições`;
      const depois = () => setFase(feitos >= 5 ? "final" : "go");
      if (fase === "go") {
        corpo = <>{cab(t)}{grade}</>;
        acoes = <><button className="btn btn-primary" onClick={() => { setFeitos(feitos + 1); setFase("pausa"); }}>Bloco {feitos + 1} feito, 4 reps</button><button className="btn btn-ghost" onClick={() => setFase("fail")}>Falhei antes de 4</button></>;
      } else if (fase === "pausa") {
        corpo = <>{cab(t)}{grade}<Pausa seg={10} acabou={depois} /></>;
        acoes = <button className="btn btn-ghost" onClick={depois}>Pular pausa</button>;
      } else if (fase === "final") {
        corpo = <>{cab(t)}{grade}<Stepper valor={ultimo} unid="reps no sexto bloco" rotulo="Repetições no sexto bloco" passo={d => setUltimo(Math.max(0, ultimo + d))} digitar={n => setUltimo(Math.max(0, Math.min(40, Math.round(n))))} /></>;
        acoes = btn("Concluir série", "btn-primary", () => fim({ blocos: 6, ultimo }));
      } else {
        corpo = <>{cab(t)}{grade}<Stepper valor={falha} unid="reps no bloco" rotulo="Repetições no bloco da falha" passo={d => setFalha(Math.max(0, Math.min(3, falha + d)))} digitar={n => setFalha(Math.max(0, Math.min(3, Math.round(n))))} /><button className="linkbtn" onClick={() => setFase("go")}>Não falhei, voltar</button></>;
        acoes = btn("Concluir série", "btn-primary", () => fim({ blocos: feitos, ultimo: falha }));
      }
    }
  }
  if (p.tipo === "TRABALHO") sub = subtituloDoPasso(s, i);

  return (
    <article className={`rcard act${p.tipo === "PREPARO" ? " prep" : ""}${modo === "edit" ? " edit" : ""}`} data-i={i}>
      <Cabeca s={s} i={i} sub={sub} info={info} />
      <Palco eq={eq} kg={kgVista} pilha={e.pilhaKg} animar>
        <div className="load"><span className="kg">{fmt(kgVista)}</span><span className="u">{u}</span>
          {p.tipo === "TRABALHO" && <button className="tip lk" data-tip="A carga fica travada nas séries válidas, como na v1. Para corrigir, volte no reel até a carga de hoje deste exercício." aria-label="Por que a carga está travada">{ICON.lock}</button>}
        </div>
      </Palco>
      <div className={`cardbody${travado ? " locked" : ""}`}>{corpo}</div>
      {slot && createPortal(acoes, slot)}
    </article>
  );
}

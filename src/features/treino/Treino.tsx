// Tela Treino (design/mock/estrutura.html: #v-treino): antes de começar, o reel da sessão e o resumo do fim.
import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { diaDaSemana, proximoTreino } from "../../domain/agenda.ts";
import { EQUIPAMENTOS, unidade } from "../../domain/equipamento.ts";
import { chaveDoExercicio, configuracao, registroDaApi } from "../../domain/historico.ts";
import { conquistaNova, diaCorrido, presenca } from "../../domain/presenca.ts";
import { estimativaMin } from "../../domain/preparo.ts";
import { sugestao } from "../../domain/progressao.ts";
import { relogio, type ExercicioDaSessao } from "../../domain/sessao.ts";
import { fmt } from "../../domain/texto.ts";
import type { Registro } from "../../domain/tipos.ts";
import { buscarUltimos, type Ultimos } from "../../app/historico.ts";
import { useProtocolo } from "../../app/protocolo.ts";
import { useTreino, type Fim } from "../../app/treino.ts";
import { Pix } from "../../components/pix.tsx";
import { Slots } from "../../components/Slots.tsx";
import { FACE } from "../../lib/faces.ts";
import { daApi, DIAN, paraTreino, type Ex } from "../../lib/plano.ts";
import { Reel } from "./Reel.tsx";
import { tempoDoDescanso, useAgora } from "./tempo.ts";

const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* O próximo treino pela agenda, como na Hoje. */
function useProximo() {
  const { protocolo, sessoes, bib } = useProtocolo();
  const r = protocolo ? daApi(protocolo) : null;
  const treinos = r ? r.dias.map((x, i) => ({ ...x, i })).filter(x => !x.folga && x.exercicios.length) : [];
  const dow = diaDaSemana(new Date()), feitoHoje = sessoes.some(s => s.diaLocal === hojeLocal());
  const prox = r ? proximoTreino({ modo: r.agenda, dias: treinos.map(x => x.i), hoje: dow, feitoHoje, proximoDaFila: Math.min(protocolo?.fila ?? 0, Math.max(0, treinos.length - 1)) }) : null;
  const nomeDe = (i: number) => r ? (r.nomes[i] || DIAN[i]!) : "";
  const quando = (emDias: number) => emDias === 0 ? "hoje" : emDias === 1 ? "amanhã" : DIAN[(dow + emDias) % 7]!.toLowerCase();
  return { protocolo, sessoes, bib, r, treinos, prox, nomeDe, quando };
}

function useContagem(alvo: number, ms = 0) {
  const [v, setV] = useState(reduzido() ? alvo : 0);
  useEffect(() => {
    if (reduzido()) return;
    const dur = Math.min(1400, 400 + alvo * 40), t0 = performance.now() + 250 + ms;
    let raf = 0;
    const passo = (t: number) => { const f = Math.max(0, Math.min(1, (t - t0) / dur)); setV(alvo * (1 - (1 - f) * (1 - f))); if (f < 1) raf = requestAnimationFrame(passo); };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, ms]);
  return Math.round(v);
}

function Resumo({ fim }: { fim: Fim }) {
  const { protocolo, sessoes, treinos, prox, nomeDe, quando } = useProximo();
  const fechar = useTreino(x => x.fecharResumo);
  const navegar = useNavigate();
  const { s, cedo } = fim;
  const totW = s.passos.filter(p => p.tipo === "TRABALHO").length;
  const segs = Math.max(60, Math.round((fim.terminadaEm - s.inicio) / 1000));
  const par = estimativaMin(s.lista.map(e => e.treino)) * 60;
  const validas = useContagem(s.validas), preparos = useContagem(s.preparos), sobem = useContagem(s.sobem), tempo = useContagem(segs);
  const n = fim.totalAntes + 1, primeira = n === 1, conquista = conquistaNova(n);
  const fase = protocolo ? { ligada: protocolo.camada.fase, semanas: protocolo.camada.semanas, meta: protocolo.camada.metaN } : { ligada: false, semanas: 6, meta: 3 };
  const pr = presenca(sessoes.map(x => diaCorrido(new Date(x.diaLocal + "T12:00:00"))), diaCorrido(new Date()), fase);
  const titulo = cedo ? "Presença registrada" : `Missão ${n} concluída`;
  const t = prox ? treinos[prox.indice] : undefined;
  const proximo = t && prox ? `Próxima: ${nomeDe(t.i)}, ${quando(prox.emDias)}.` + (protocolo?.agenda === "sequencia" ? " De preferência com um dia de intervalo." : "") : "";
  const feito = (k: number) => s.passos.some((p, i) => p.k === k && p.tipo === "TRABALHO" && s.res[i]);
  const sobemLista = s.lista.map((e, k) => ({ e, w: s.wk[k]! })).filter(x => x.w.sobe);
  return (
    <div id="sessDone" className="col">
      <div className="done-hero">
        <img className={`face${reduzido() ? "" : " shake"}`} src={FACE[cedo ? 10 : 13]} width={72} height={112} alt="Doom face de comemoração" />
        <div className="col" style={{ gap: 6 }}>
          <h2 id="doneTitle">{titulo.split(" ").map((w, j) => <Fragment key={j}>{j > 0 && " "}<span className="w" style={{ display: "inline-block" }}>{w}</span></Fragment>)}</h2>
          <div className="next-meta">{s.titulo} concluída</div>
        </div>
      </div>
      <div className="inter" id="inter">
        <div><span>Séries</span><b className="num">{validas}/{totW}</b></div>
        <div><span>Preparo</span><b className="num">{preparos}</b></div>
        <div><span>Cargas sobem</span><b className="num">{sobem}</b></div>
        <div><span>Tempo</span><b className="num">{relogio(tempo)}</b></div>
        <div className="par"><span>Par <small>estimativa do plano</small></span><b className="num">{relogio(par)}</b></div>
      </div>
      <Slots feitos={pr.feitosNaSemana} meta={protocolo?.camada.metaN ?? 3} />
      <div className="prog-list" id="nextUps">
        {primeira ? <>
          <p className="next-meta">Cargas guardadas como referência para o próximo treino:</p>
          {s.lista.map((e, k) => feito(k) && <div key={k} className="prog"><span className="name">{e.nome}</span><span className="delta hold">{fmt(s.wk[k]!.kg)} {unidade(e.treino.equipamento)}</span></div>)}
        </> : sobemLista.length
          ? sobemLista.map(({ e, w }, k) => <div key={k} className="prog"><span className="name">{e.nome}</span><span className="delta up">{fmt(w.kg)} para {fmt(w.proxima)} {unidade(e.treino.equipamento)}</span></div>)
          : <p className="next-meta">Nenhuma carga sobe desta vez. A regra de cada série fica para a próxima.</p>}
      </div>
      {conquista && !cedo && (
        <div className="achrow"><img className="face" src={FACE[10]} alt="" width={36} height={56} />
          <p>Conquista nova: <b>{conquista.nome}</b> <button className="tip infobtn" aria-label="Sobre a conquista"
            data-tip={primeira ? "O primeiro treino concluído. As conquistas premiam presença e carga subindo, nunca dias seguidos." : `${conquista.treinos} treinos. As conquistas premiam presença e carga subindo, nunca dias seguidos.`}><Pix nome="info" w={16} /></button></p>
        </div>
      )}
      {proximo && <p>{proximo}</p>}
      <button className="btn btn-ghost" onClick={() => { fechar(); navegar("/"); }}>Voltar para Hoje</button>
    </div>
  );
}

export function Treino() {
  const { carregado, carregar } = useProtocolo();
  const { protocolo, sessoes, bib, r, treinos, prox, nomeDe } = useProximo();
  const { sessao, fim, restaurado, restaurar, comecar } = useTreino();
  const local = useLocation(), navegar = useNavigate();
  const [ultimos, setUltimos] = useState<Ultimos>({});
  const pedido = (local.state as { dia?: number } | null)?.dia;
  const iniciando = useRef(false);

  useEffect(() => { if (!carregado) void carregar(); }, [carregado, carregar]);
  useEffect(() => { void restaurar(); }, [restaurar]);

  const t = pedido != null ? treinos.find(x => x.i === pedido) : (prox ? treinos[prox.indice] : undefined);
  const pedidos = t ? t.exercicios.map(e => ({ chave: chaveDoExercicio(e.id), configuracao: configuracao(e.series) })) : [];
  const chave = JSON.stringify(pedidos);
  useEffect(() => {
    const itens = JSON.parse(chave) as typeof pedidos;
    if (itens.length) void buscarUltimos(itens).then(setUltimos);
  }, [chave]);

  const ultimoDe = (e: Ex): Registro | null => {
    const u = ultimos[`${chaveDoExercicio(e.id)}|${configuracao(e.series)}`];
    return u ? registroDaApi(u.registros, e.series) : null;
  };

  async function comecarTreino() {
    if (!t || !r || iniciando.current) return;
    iniciando.current = true;
    const lista = paraTreino(r, t.exercicios, bib);
    const itens = t.exercicios.map(e => ({ chave: chaveDoExercicio(e.id), configuracao: configuracao(e.series) }));
    const u = await buscarUltimos(itens);
    const ult = (e: Ex) => { const x = u[`${chaveDoExercicio(e.id)}|${configuracao(e.series)}`]; return x ? registroDaApi(x.registros, e.series) : null; };
    const dias = sessoes.map(s => diaCorrido(new Date(s.diaLocal + "T12:00:00")));
    const diasParado = dias.length ? diaCorrido(new Date()) - Math.max(...dias) : 0;
    const exs: ExercicioDaSessao[] = t.exercicios.map((e, k) => ({
      uid: e.uid, id: e.id, nome: bib[e.id]?.nome ?? e.id, pilhaKg: bib[e.id]?.pilhaKg ?? null,
      chave: chaveDoExercicio(e.id), configuracao: configuracao(e.series), ultimo: ult(e), treino: lista[k]!
    }));
    await comecar({
      id: crypto.randomUUID(), titulo: nomeDe(t.i), dia: t.i, indiceTreino: treinos.indexOf(t), protocoloId: protocolo?.id ?? null,
      protocoloVersao: protocolo?.versao ?? null, diaLocal: hojeLocal(), inicio: Date.now(), diasParado, lista: exs
    });
    iniciando.current = false;
    navegar("/treino", { replace: true, state: null });
  }

  // Veio da Hoje pelo botão de começar: a sessão começa direto, como no mock.
  useEffect(() => {
    if (!restaurado || !carregado || pedido == null) return;
    if (!sessao && t) void comecarTreino();
    else navegar("/treino", { replace: true, state: null });
  });

  if (!restaurado) return null;
  if (fim && !sessao) return <Resumo fim={fim} />;
  if (sessao) return <Reel s={sessao} />;

  if (!t) {
    return <div id="sessIdle" className="col">
      <h2 className="next-title">{carregado ? "Sem protocolo ainda" : "Carregando"}</h2>
      <p className="next-meta">Os treinos aparecem aqui depois que o protocolo for montado.</p>
      <button className="btn btn-primary" onClick={() => navegar("/plano")}>Montar protocolo</button>
    </div>;
  }
  const nome = nomeDe(t.i);
  return (
    <div id="sessIdle" className="col">
      <h2 className="next-title">Cargas de {nome}</h2>
      <div className="prog-list">
        {t.exercicios.map(e => {
          const L = bib[e.id], eq = L?.equipamento ?? "pilha", sg = sugestao(e.series, ultimoDe(e), eq);
          return <div key={e.uid} className="prog"><span className="name">{L?.nome ?? e.id}<small>{EQUIPAMENTOS[eq].nome}</small></span>
            <button className={`tip delta ${sg.sobe ? "up" : "hold"}`} data-tip={sg.porque}>{sg.kg == null ? "carga na hora" : `${fmt(sg.kg)} ${unidade(eq)}, ${sg.sobe ? "+" + fmt(EQUIPAMENTOS[eq].incremento) : "mantém"}`}</button></div>;
        })}
      </div>
      <button className="btn btn-primary" onClick={() => void comecarTreino()}>Começar {nome}</button>
    </div>
  );
}

/* Fora da tela de treino, o descanso vira rodapé (sessao.js: drawRest e #restFoot). */
export function RodapeDoDescanso() {
  const sessao = useTreino(x => x.sessao);
  const local = useLocation(), navegar = useNavigate();
  const agora = useAgora(250);
  if (!sessao?.descanso || local.pathname.startsWith("/treino")) return null;
  const t = tempoDoDescanso(sessao.descanso, agora);
  return (
    <div className="restfoot" id="restFoot">
      <div className="trk3"><i style={{ width: `${t.pct * 100}%`, backgroundColor: t.cor }} /></div>
      <div className="rrow"><div className="rt"><small>Descanso</small><b className="num">{t.texto}</b></div><span className="sp" /><button className="rgo" onClick={() => navegar("/treino")}>Voltar ao treino</button></div>
    </div>
  );
}

/* O clarão da tela: dourado no recorde e na progressão, vermelho na série pesada. */
export function Clarao() {
  const flash = useTreino(x => x.flash);
  if (!flash || reduzido()) return <div className="flash" aria-hidden="true" />;
  return <div key={flash.n} className={`flash ${flash.tipo} go`} aria-hidden="true" />;
}

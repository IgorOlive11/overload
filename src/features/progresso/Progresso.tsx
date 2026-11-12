// Tela Progresso, portada de design/mock/progresso.js e primeiro-acesso.js (frProg), com os dados da conta.
// Conquistas: só as quatro por número de treinos (docs/produto/rascunho-regras.md); Sem desculpa e Rip and tear do mock
// ficam fora até o dono decidir a definição nova (pergunta 5 do rascunho).
import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { unidade } from "../../domain/equipamento.ts";
import { chaveDoExercicio, configuracao, registroDaApi } from "../../domain/historico.ts";
import { CONQUISTAS, diaCorrido } from "../../domain/presenca.ts";
import { gradeDeSemanas, resumoDaFase, ultimasCargas, vezesQueSubiu, type CargaDaSessao } from "../../domain/progresso.ts";
import { sugestao } from "../../domain/progressao.ts";
import { fmt } from "../../domain/texto.ts";
import type { Equipamento } from "../../domain/tipos.ts";
import { buscarUltimos, type Ultimos } from "../../app/historico.ts";
import { useProtocolo } from "../../app/protocolo.ts";
import { Pix } from "../../components/pix.tsx";
import { api } from "../../lib/api.ts";
import { FACE } from "../../lib/faces.ts";
import { gravarChave, lerChave } from "../../lib/idb.ts";
import { daApi, type Ex } from "../../lib/plano.ts";

const FACE_DA_CONQUISTA: Record<string, number> = { primeira_missao: 9, habitue: 10, veterano: 11, doom_slayer: 13 };
const DESC: Record<string, string> = { primeira_missao: "primeiro treino", habitue: "5 treinos", veterano: "10 treinos", doom_slayer: "30 treinos" };

/* A linha de carga das últimas sessões (progresso.js: spark), em degraus. */
function Linha({ h, sobe }: { h: number[]; sobe: boolean }) {
  const W = 110, A = 40, min = Math.min(...h), max = Math.max(...h), rng = (max - min) || 1;
  const pts = h.map((v, i) => [i * (W / (h.length - 1)), A - 4 - ((v - min) / rng) * (A - 10)] as const);
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) d += ` H${pts[i]![0]} V${pts[i]![1]}`;
  const ult = pts.at(-1)!;
  return <svg viewBox={`0 0 ${W} ${A}`} aria-hidden="true"><path d={`${d} V${A} H0 Z`} fill="var(--accent-soft)" /><path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} /><circle cx={ult[0]} cy={ult[1]} r={3.5} fill={sobe ? "var(--ok)" : "var(--chalk)"} /></svg>;
}

const N = ({ v }: { v: number }) => <b className="num">{v}</b>;

export function Progresso() {
  const { protocolo, sessoes, carregado, carregar, bib } = useProtocolo();
  const navegar = useNavigate();
  const [cargas, setCargas] = useState<CargaDaSessao[]>([]);
  const [ultimos, setUltimos] = useState<Ultimos>({});
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (!carregado) void carregar(); }, [carregado, carregar]);
  useEffect(() => {
    void (async () => {
      try {
        const { cargas: c } = await api<{ cargas: CargaDaSessao[] }>("GET", "/progresso");
        setCargas(c); await gravarChave("progresso", c);
      } catch { setCargas((await lerChave<CargaDaSessao[]>("progresso").catch(() => undefined)) ?? []); }
    })();
  }, [sessoes.length]);

  // Exercícios do protocolo, uma vez cada, na ordem da semana.
  const r = protocolo ? daApi(protocolo) : null;
  const exs: Ex[] = [];
  r?.dias.forEach(d => { if (!d.folga) d.exercicios.forEach(e => { if (!exs.some(x => x.id === e.id)) exs.push(e); }); });
  const itens = exs.map(e => ({ chave: chaveDoExercicio(e.id), configuracao: configuracao(e.series) })).slice(0, 40);
  const chave = JSON.stringify(itens);
  useEffect(() => { const i = JSON.parse(chave) as typeof itens; if (i.length) void buscarUltimos(i).then(setUltimos); }, [chave]);

  // O título encolhe ao rolar, como o ScrollTrigger do mock.
  useEffect(() => {
    const tela = titulo.current?.closest(".screen") as HTMLElement | null;
    if (!tela || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rolar = () => { if (titulo.current) titulo.current.style.transform = `scale(${1 - .28 * Math.min(1, tela.scrollTop / 120)})`; };
    tela.addEventListener("scroll", rolar, { passive: true });
    return () => tela.removeEventListener("scroll", rolar);
  }, []);

  const dias = sessoes.map(s => diaCorrido(new Date(s.diaLocal + "T12:00:00")));
  const hoje = diaCorrido(new Date());
  const fase = protocolo ? { ligada: protocolo.camada.fase, semanas: protocolo.camada.semanas, meta: protocolo.camada.metaN } : { ligada: false, semanas: 6, meta: 3 };
  const total = sessoes.length;
  const topo = <div className="ptop"><h2 id="pTitle" ref={titulo} style={{ transformOrigin: "left center" }}>Progresso</h2></div>;

  if (!total) {
    const temTreino = !!r?.dias.some(d => !d.folga && d.exercicios.length);
    return <>{topo}
      <div className="card empty"><img className="face" src={FACE[9]} width={48} height={74} alt="" /><h3>Nada por aqui ainda</h3>
        <p>Depois do primeiro treino aparecem a presença da semana, as conquistas e a carga de cada exercício.</p>
        <button className="btn btn-primary" onClick={() => navegar(temTreino ? "/" : "/plano")}>{temTreino ? "Ver o primeiro treino" : "Montar protocolo"}</button></div>
    </>;
  }

  const rs = resumoDaFase(dias, hoje, fase), grade = gradeDeSemanas(dias, hoje, fase), subiu = vezesQueSubiu(cargas);
  const ganhas = CONQUISTAS.filter(c => total >= c.treinos).length;
  const fechou = rs.completas === 0 ? null
    : rs.naMeta === rs.completas ? <>, fechou {rs.completas === 1 ? "a" : "as"} <N v={rs.naMeta} /> {rs.completas === 1 ? "semana completa" : "semanas completas"} na meta</>
    : <>, fechou <N v={rs.naMeta} /> de {rs.completas} {rs.completas === 1 ? "semana completa" : "semanas completas"} na meta</>;

  return <>
    {topo}
    <p className="lead">
      {fase.ligada ? "Fase 1, semana" : "Semana"} {rs.semana}. Você fez <N v={rs.feitos} /> das {rs.possiveis} sessões possíveis até agora{fechou} e a carga subiu <N v={subiu} /> {subiu === 1 ? "vez" : "vezes"}.
    </p>
    <div className="card">
      <div className="row between"><h3>Presença por semana</h3><button className="tip infobtn" data-tip="Verde: sessão feita. Tracejado: vaga de bônus. Borda vermelha: a próxima sessão." aria-label="Legenda"><Pix nome="info" w={16} /></button></div>
      <div className="grid-weeks" style={{ gridTemplateColumns: `auto repeat(${fase.meta + 1}, 1fr)` }}>
        {grade.map(s => <Fragment key={s.n}><span className={`wk${s.atual ? " now" : ""}`}>Sem {s.n}</span>{s.celulas.map((c, i) => <div key={i} className={`cell ${c}`} />)}</Fragment>)}
      </div>
    </div>
    <div className="card">
      <div className="row between"><h3>Conquistas</h3><button className="tip pill" data-tip="As conquistas premiam presença e carga subindo, nunca dias seguidos.">{ganhas} de {CONQUISTAS.length}</button></div>
      <div className="ach" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {CONQUISTAS.map(c => {
          const tem = total >= c.treinos;
          return <div key={c.id} className={tem ? "" : "lock"}><img className="face" src={FACE[FACE_DA_CONQUISTA[c.id] ?? 10]} alt="" width={36} height={56} /><b>{c.nome}</b>
            <span>{DESC[c.id]}{!tem && c.treinos > 1 ? `, faltam ${c.treinos - total}` : ""}</span></div>;
        })}
      </div>
    </div>
    <div className="card">
      <div className="row between"><h3>Carga por exercício</h3><button className="tip infobtn" data-tip="Linha das últimas 5 sessões de cada exercício. Ponto verde: a carga sobe na próxima." aria-label="Sobre o gráfico"><Pix nome="info" w={16} /></button></div>
      <div id="exProg">
        {exs.map(e => {
          const k = chaveDoExercicio(e.id), cfg = configuracao(e.series), h = ultimasCargas(cargas, k, cfg);
          if (!h.length) return null;
          const eq = (bib[e.id]?.equipamento ?? "pilha") as Equipamento, u = ultimos[`${k}|${cfg}`];
          const sg = sugestao(e.series, u ? registroDaApi(u.registros, e.series) : null, eq);
          return <div key={e.id} className="ex-prog"><span className="nm">{bib[e.id]?.nome ?? e.id}</span>
            {h.length > 1 ? <Linha h={h} sobe={sg.sobe} /> : <small className="why">1 sessão</small>}
            <button className={`tip pill${sg.sobe ? " up" : ""}`} style={{ justifySelf: "start" }} data-tip={`Cargas das últimas ${h.length} sessões: ${h.map(fmt).join(", ")} kg. ${sg.porque}`}>{fmt(h.at(-1)!)} {unidade(eq)}</button></div>;
        })}
      </div>
    </div>
  </>;
}

// Aba Plano: fase atual e montagem de protocolo, como no mock (estrutura.html #v-plano e primeiro-acesso.js: frPlan e a camada "phase").
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { diaDaSemana, proximoTreino } from "../../domain/agenda.ts";
import { GER } from "../../domain/ger.ts";
import { diaCorrido, presenca } from "../../domain/presenca.ts";
import { api } from "../../lib/api.ts";
import { gravarChave, lerChave } from "../../lib/idb.ts";
import { Pix } from "../../components/pix.tsx";
import { FACE } from "../../lib/faces.ts";
import { useApp } from "../../app/estado.ts";
import { rascunhoDoProtocolo, useProtocolo } from "../../app/protocolo.ts";
import { toast } from "../../lib/aviso.ts";
import { ICON } from "../../components/icones.tsx";
import { Montador } from "./Montador.tsx";
import { bibDaApi, DIAS, resumoDoEx, type Rascunho } from "../../lib/plano.ts";

const DIAS_TXT = (d: number) => d === 1 ? "1 dia" : d + " dias";
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

interface Ideia { id: string; texto: string }

/* Ideias para a próxima fase (plano-fase.js), na conta; sem rede, a lista guardada no aparelho. */
function Ideias({ semana }: { semana: number }) {
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [texto, setTexto] = useState("");
  useEffect(() => {
    void (async () => {
      try { const { ideias: i } = await api<{ ideias: Ideia[] }>("GET", "/ideias"); setIdeias(i); await gravarChave("ideias", i); }
      catch { setIdeias((await lerChave<Ideia[]>("ideias").catch(() => undefined)) ?? []); }
    })();
  }, []);
  const anotar = async () => {
    const v = texto.trim(); if (!v) return;
    try {
      const { ideia } = await api<{ ideia: Ideia }>("POST", "/ideias", { texto: v });
      const novas = [...ideias, ideia]; setIdeias(novas); setTexto(""); void gravarChave("ideias", novas);
    } catch { toast("Sem conexão", "A ideia não foi anotada. Tente de novo com internet.", 8); }
  };
  const apagar = async (id: string) => {
    try { await api("DELETE", `/ideias/${id}`); const novas = ideias.filter(i => i.id !== id); setIdeias(novas); void gravarChave("ideias", novas); }
    catch { toast("Sem conexão", "Tente apagar de novo com internet.", 8); }
  };
  return (
    <div className="card">
      <h3>Ideias para a semana {semana}</h3>
      <form className="idea-form" onSubmit={e => { e.preventDefault(); void anotar(); }}>
        <label className="sr" htmlFor="ideaInput">Nova ideia</label>
        <input id="ideaInput" placeholder="Ex.: trocar flexora por adutora" autoComplete="off" maxLength={200} value={texto} onChange={e => setTexto(e.target.value)} />
        <button type="submit">Anotar</button>
      </form>
      <ul className="ideas">{ideias.map(i => <li key={i.id}>{i.texto} <button className="linkbtn" aria-label={`Apagar a ideia: ${i.texto}`} onClick={() => void apagar(i.id)}><Pix nome="x" w={10} /></button></li>)}</ul>
    </div>
  );
}

export function Plano() {
  const { protocolo, sessoes, carregado, carregar, salvar, bib } = useProtocolo();
  const { conta, sair, fila } = useApp();
  const local = useLocation();
  const [vista, setVista] = useState<"cur" | "build">((local.state as { montar?: boolean } | null)?.montar ? "build" : "cur");
  const [primeiraFase, setPrimeiraFase] = useState<Rascunho | null>(null);
  const navegar = useNavigate();
  useEffect(() => { if (!carregado) void carregar(); }, [carregado, carregar]);

  const hoje = diaCorrido(new Date());
  const dias = sessoes.map(s => diaCorrido(new Date(s.diaLocal + "T12:00:00")));
  const fase = protocolo ? { ligada: protocolo.camada.fase, semanas: protocolo.camada.semanas, meta: protocolo.camada.metaN } : { ligada: false, semanas: 6, meta: 3 };
  const pr = presenca(dias, hoje, fase);

  const sairComCuidado = async () => {
    if (fila.pendentes && !confirm(`Ainda há ${fila.pendentes} registro(s) sem enviar. Sair agora apaga esses registros do aparelho. Sair mesmo assim?`)) return;
    await sair();
  };

  const aoSalvar = async (r: Rascunho) => {
    const primeiro = !protocolo;
    await salvar(r);
    if (primeiro) { setPrimeiraFase(r); return; }
    toast("Protocolo ajustado", !dias.length ? "A semana de ajuste começa no primeiro treino." : `Ainda faltam ${DIAS_TXT(pr.ajusteRestante)} de semana de ajuste.`, 10, true);
    setVista("cur");
  };

  if (primeiraFase) {
    const goal = primeiraFase.camada.metaN, seq = primeiraFase.agenda === "sequencia";
    return (
      <div className="frlayer full"><div className="frbox">
        <img className="face" src={FACE[10]} width={48} height={74} alt="" />
        <h2 className="frh">Sua primeira fase</h2>
        <ul className="frlist">
          <li><b>Tudo começa no seu primeiro treino.</b> Pode ser hoje ou daqui a uns dias: até lá nada conta como falta.</li>
          <li><b>Meta de {goal} {goal > 1 ? "treinos" : "treino"} por semana.</b> Em qualquer dia: o que conta é aparecer.</li>
          <li><b>Semana de ajuste.</b> Nos 7 dias depois do primeiro treino você mexe no protocolo à vontade, porque é quando aparece exercício que não cabe na sua academia.</li>
          <li><b>Depois, a fase trava por {primeiraFase.camada.semanas} semanas.</b> Ideias de mudança ficam anotadas para a próxima fase, assim o corpo tem tempo de responder.</li>
          <li><b>Nunca faltar duas vezes.</b> Perdeu um treino, o próximo vira obrigatório.</li>
          <li><b>{seq ? "Treinos em fila." : "Cada treino no seu dia."}</b> {seq ? "Se faltar, você faz o que ficou para trás." : "Se faltar, aquele treino volta na semana seguinte."}</li>
        </ul>
        <button className="btn btn-primary" onClick={() => { setPrimeiraFase(null); setVista("cur"); navegar("/", { state: { primeiro: true } }); }}>Bora</button>
      </div></div>
    );
  }

  const treinos = protocolo ? protocolo.dias.map((x, i) => ({ ...x, i })).filter(x => !x.folga && x.exercicios.length) : [];
  const r = protocolo ? rascunhoDoProtocolo(protocolo) : null;
  const prox = protocolo && r ? proximoTreino({ modo: r.agenda, dias: treinos.map(x => x.i), hoje: diaDaSemana(new Date()), feitoHoje: sessoes.some(s => s.diaLocal === hojeLocal()), proximoDaFila: Math.min(protocolo.fila ?? 0, Math.max(0, treinos.length - 1)) }) : null;
  const naFase = Math.min(pr.total, fase.meta * fase.semanas), possiveis = fase.meta * fase.semanas;
  const b = protocolo ? { ...bib, ...bibDaApi(protocolo) } : bib;

  return <>
    <div className="topbar"><div className="mark">Plano</div>{protocolo && <span className="chip">fase 1</span>}</div>
    <div className="seg big" role="group" aria-label="Seção do plano">
      <button aria-pressed={vista === "cur"} onClick={() => setVista("cur")}>Fase atual</button>
      <button aria-pressed={vista === "build"} onClick={() => setVista("build")}>Montar protocolo</button>
    </div>

    {vista === "cur" && <div className="col" style={{ gap: 16 }}>
      {!carregado ? null : !protocolo ? (
        <div className="card empty"><img className="face" src={FACE[8]} width={48} height={74} alt="" /><h3>Você ainda não tem protocolo</h3>
          <p>Escolha um modelo pronto ou monte do zero. Leva poucos minutos.</p>
          <button className="btn btn-primary" onClick={() => setVista("build")}>Montar protocolo</button></div>
      ) : <>
        <div className="timeline">{Array.from({ length: protocolo.camada.semanas }, (_, w) => w + 1).map(w => <div key={w} className={w < pr.semana ? "past" : w === pr.semana ? "now" : ""}>S{w}</div>)}</div>
        {!dias.length
          ? <div className="card adjust"><h3>Semana de ajuste</h3><p>Começa no seu primeiro treino e dura 7 dias. Até lá, e durante ela, troque o que precisar: um exercício que sua academia não tem, um dia que não encaixa.</p><button className="btn btn-ghost" onClick={() => setVista("build")}>Ajustar protocolo</button></div>
          : pr.ajusteRestante > 0
            ? <div className="card adjust"><h3>Semana de ajuste</h3><p>Faltam {DIAS_TXT(pr.ajusteRestante)} para a fase travar. Até lá, troque o que precisar: um exercício que sua academia não tem, um dia que não encaixa.</p><button className="btn btn-ghost" onClick={() => setVista("build")}>Ajustar protocolo</button></div>
            : <div className="card"><div className="lock">{ICON.cadeado}<h3>Travado até a semana {protocolo.camada.semanas + 1} <button className="tip infobtn" aria-label="Por que o plano está travado"
                data-tip={`Esta fase foi criada com a camada de aderência ligada: plano travado, meta de ${fase.meta} ${fase.meta > 1 ? "sessões" : "sessão"} por semana, treino ${protocolo.agenda === "sequencia" ? "por sequência" : "no dia fixo"}${protocolo.camada.nuncaDuas ? " e regra de nunca faltar duas vezes" : ""}. Anote ideias abaixo para a próxima fase.`}><Pix nome="info" w={16} /></button></h3></div></div>}
        {fase.ligada && dias.length > 0 && <div className="card">
          <div className="row between"><h3>Fase 1</h3><button className="tip pill" data-tip={`Sessões feitas na fase, de ${possiveis} possíveis com a meta de ${fase.meta} por semana em ${fase.semanas} semanas.`}><span className="num">{naFase} de {possiveis}</span></button></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(naFase / possiveis * 100).toFixed(1)}%` }} /></div>
        </div>}
        {pr.travado && <Ideias semana={protocolo.camada.semanas + 1} />}
        {treinos.map(x => {
          const l = r!.dias[x.i]!.exercicios;
          const ehProx = !!prox && treinos[prox.indice]?.i === x.i;
          return <details className="card" key={x.i} open={ehProx}><summary><h3>{x.nome || DIAS[x.i]}{ehProx ? " · próximo" : ""}</h3></summary>
            <ul className="plan-list">{l.map((e, k) => {
              const res = resumoDoEx(r!, l, k, b);
              return <li key={e.uid}><span>{b[e.id]?.nome ?? e.id}</span><span><span className="sdots" aria-hidden="true">{Array.from({ length: res.preparo }, (_, i) => <i key={`w${i}`} className="w" />)}{Array.from({ length: res.validas }, (_, i) => <i key={i} />)}</span>{res.texto}</span></li>;
            })}</ul>
            {/* Escolha livre, escondida aqui (decisão do PO de 11/11): a Hoje só oferece o próximo. */}
            {!ehProx && <button className="linkbtn" onClick={() => navegar("/treino", { state: { dia: x.i } })}>Treinar este hoje</button>}
          </details>;
        })}
        <details className="card">
          <summary><h3>Como executar</h3></summary>
          <ol className="rules">
            <li>Termine cada série com a reserva combinada no exercício, a carinha do Doomguy. A escala vai de {GER[7]!.alvo} até {GER[10]!.alvo.toLowerCase()}.</li>
            <li>Chegou ao topo da faixa em todas as séries, sem passar do esforço combinado: a carga sobe no próximo treino.</li>
            <li>O preparo segue o músculo: 3 séries na primeira vez dele no treino, 2 quando já trabalhou como acessório e 1 quando já foi o principal.</li>
            {protocolo.camada.nuncaDuas && <li>Faltou uma vez: a próxima oportunidade é obrigatória.</li>}
          </ol>
        </details>
      </>}
      {/* O mock não mostra onde fica o Sair; até a decisão, ele fica no fim do Plano. */}
      <button className="linkbtn" onClick={() => void sairComCuidado()}>Sair da conta ({conta?.nome})</button>
    </div>}

    {vista === "build" && carregado && (
      <Montador inicial={r} bibInicial={b} travado={!!protocolo && pr.travado} salvar={aoSalvar} />
    )}
  </>;
}


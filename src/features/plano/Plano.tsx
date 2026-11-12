// Aba Plano: fase atual e montagem de protocolo, como no mock (estrutura.html #v-plano e primeiro-acesso.js: frPlan e a camada "phase").
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { diaCorrido, presenca } from "../../domain/presenca.ts";
import { FACE } from "../../lib/faces.ts";
import { useApp } from "../../app/estado.ts";
import { rascunhoDoProtocolo, useProtocolo } from "../../app/protocolo.ts";
import { toast } from "../../lib/aviso.ts";
import { ICON } from "../../components/icones.tsx";
import { Montador } from "./Montador.tsx";
import { bibDaApi, DIAS, resumoDoEx, type Rascunho } from "./modelo.ts";

const DIAS_TXT = (d: number) => d === 1 ? "1 dia" : d + " dias";

export function Plano() {
  const { protocolo, sessoes, carregado, carregar, salvar, bib } = useProtocolo();
  const { conta, sair, fila } = useApp();
  const [vista, setVista] = useState<"cur" | "build">("cur");
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
        <button className="btn btn-primary" onClick={() => { setPrimeiraFase(null); setVista("cur"); navegar("/"); }}>Bora</button>
      </div></div>
    );
  }

  const treinos = protocolo ? protocolo.dias.map((x, i) => ({ ...x, i })).filter(x => !x.folga && x.exercicios.length) : [];
  const r = protocolo ? rascunhoDoProtocolo(protocolo) : null;
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
            : <div className="card"><div className="lock">{ICON.cadeado}<h3>Travado até a semana {protocolo.camada.semanas + 1}</h3></div><p className="why">A semana de ajuste acabou. Ideias de mudança ficam para a próxima fase.</p></div>}
        {treinos.map(x => {
          const l = r!.dias[x.i]!.exercicios;
          return <details className="card" key={x.i}><summary><h3>{x.nome || DIAS[x.i]}</h3></summary>
            <ul className="plan-list">{l.map((e, k) => {
              const res = resumoDoEx(r!, l, k, b);
              return <li key={e.uid}><span>{b[e.id]?.nome ?? e.id}</span><span><span className="sdots" aria-hidden="true">{Array.from({ length: res.preparo }, (_, i) => <i key={`w${i}`} className="w" />)}{Array.from({ length: res.validas }, (_, i) => <i key={i} />)}</span>{res.texto}</span></li>;
            })}</ul></details>;
        })}
      </>}
      {/* O mock não mostra onde fica o Sair; até a decisão, ele fica no fim do Plano. */}
      <button className="linkbtn" onClick={() => void sairComCuidado()}>Sair da conta ({conta?.nome})</button>
    </div>}

    {vista === "build" && carregado && (
      <Montador inicial={r} bibInicial={b} travado={!!protocolo && pr.travado} salvar={aoSalvar} />
    )}
  </>;
}


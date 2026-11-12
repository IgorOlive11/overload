// Tela Hoje, portada de design/mock/hoje.js e primeiro-acesso.js (frHome), com os dados da conta.
// Mostra só o próximo treino pelo modo de agenda (decisão do PO de 11/11); a escolha livre fica escondida no Plano.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { diaDaSemana, proximoTreino } from "../../domain/agenda.ts";
import { EQUIPAMENTOS, unidade } from "../../domain/equipamento.ts";
import { GER } from "../../domain/ger.ts";
import { chaveDoExercicio, configuracao, registroDaApi, type RegistroDaApi } from "../../domain/historico.ts";
import { avisoDeVolta, diaCorrido, presenca } from "../../domain/presenca.ts";
import { estimativaMin } from "../../domain/preparo.ts";
import { sugestao } from "../../domain/progressao.ts";
import { fmt } from "../../domain/texto.ts";
import type { Equipamento, Registro } from "../../domain/tipos.ts";
import { useProtocolo } from "../../app/protocolo.ts";
import { Pix } from "../../components/pix.tsx";
import { Palco } from "../../components/Palco.tsx";
import { api } from "../../lib/api.ts";
import { FACE } from "../../lib/faces.ts";
import { gravarChave, lerChave } from "../../lib/idb.ts";
import { daApi, DIAN, paraTreino, type Ex } from "../../lib/plano.ts";

const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

type Ultimos = Record<string, { em: string; registros: RegistroDaApi[] } | null>;

function Slots({ feitos, meta }: { feitos: number; meta: number }) {
  const bonus = feitos > meta;
  return (
    <div className="slots">
      {Array.from({ length: meta }, (_, i) => (
        <div key={i} className={`slot ${i < feitos ? "done" : ""}`} aria-label={i < feitos ? "Sessão feita" : "Sessão pendente"}>{i < feitos ? <Pix nome="check" w={20} /> : i + 1}</div>
      ))}
      <div className={`slot bonus ${bonus ? "done" : ""}`} aria-label="Bônus">{bonus ? <Pix nome="check" w={20} /> : <Pix nome="skey" w={14} />}</div>
      <div className="week-count num">{Math.min(feitos, meta)}<small> de {meta}</small></div>
    </div>
  );
}

export function Hoje() {
  const { protocolo, sessoes, carregado, carregar, bib } = useProtocolo();
  const [ultimos, setUltimos] = useState<Ultimos>({});
  const navegar = useNavigate();
  useEffect(() => { if (!carregado) void carregar(); }, [carregado, carregar]);

  const r = protocolo ? daApi(protocolo) : null;
  const treinos = r ? r.dias.map((x, i) => ({ ...x, i })).filter(x => !x.folga && x.exercicios.length) : [];
  const hoje = hojeLocal(), dow = diaDaSemana(new Date());
  const feitoHoje = sessoes.some(s => s.diaLocal === hoje);
  const prox = r ? proximoTreino({ modo: r.agenda, dias: treinos.map(x => x.i), hoje: dow, feitoHoje, proximoDaFila: Math.min(protocolo?.fila ?? 0, Math.max(0, treinos.length - 1)) }) : null;
  const t = prox ? treinos[prox.indice] : undefined;
  const nome = t ? (r!.nomes[t.i] || DIAN[t.i]!) : "";

  // A última vez de cada exercício do próximo treino, guardada no aparelho para abrir sem internet.
  const pedidos = t ? t.exercicios.map(e => ({ chave: chaveDoExercicio(e.id), configuracao: configuracao(e.series) })) : [];
  const chavePedidos = JSON.stringify(pedidos);
  useEffect(() => {
    const itens = JSON.parse(chavePedidos) as typeof pedidos;
    if (!itens.length) return;
    void (async () => {
      try {
        const { ultimos: u } = await api<{ ultimos: Ultimos }>("POST", "/historico/ultimos", { itens });
        setUltimos(a => ({ ...a, ...u }));
        await gravarChave("ultimos", { ...((await lerChave<Ultimos>("ultimos")) ?? {}), ...u });
      } catch {
        const salvo = await lerChave<Ultimos>("ultimos").catch(() => undefined);
        if (salvo) setUltimos(a => ({ ...a, ...salvo }));
      }
    })();
  }, [chavePedidos]);

  const ultimoDe = (e: Ex): Registro | null => {
    const u = ultimos[`${chaveDoExercicio(e.id)}|${configuracao(e.series)}`];
    return u ? registroDaApi(u.registros, e.series) : null;
  };
  const eqDe = (e: Ex) => (bib[e.id]?.equipamento ?? "pilha") as Equipamento;

  const diasFeitos = sessoes.map(s => diaCorrido(new Date(s.diaLocal + "T12:00:00")));
  const fase = protocolo ? { ligada: protocolo.camada.fase, semanas: protocolo.camada.semanas, meta: protocolo.camada.metaN } : { ligada: false, semanas: 6, meta: 3 };
  const pr = presenca(diasFeitos, diaCorrido(new Date()), fase);
  const meta = protocolo?.camada.meta ? protocolo.camada.metaN : (protocolo?.camada.metaN ?? 3);
  const total = sessoes.length;
  const ultimoTreino = diasFeitos.length ? Math.max(...diasFeitos) : null;
  const parado = ultimoTreino == null ? 0 : diaCorrido(new Date()) - ultimoTreino;
  const volta = avisoDeVolta(parado);

  const quando = (emDias: number) => emDias === 0 ? "hoje" : emDias === 1 ? "amanhã" : DIAN[(dow + emDias) % 7]!.toLowerCase();

  // Sem protocolo: o Hoje do mock para a conta nova.
  if (!r || !t || !prox) {
    return <>
      <div className="topbar"><div className="mark">Overload</div><div className="row" style={{ gap: 6 }}>
        <button className="tip chip map" data-tip="Primeira missão da fase 1.">Episódio <b>1</b> · Missão <b>{total + 1}</b></button></div></div>
      <div className="hero"><Palco eq="carregada" kg={40}><button className="load tip" data-tip="Aqui aparece a carga do primeiro exercício do próximo treino."><span className="kg">?</span><span className="u" /><span className="ex">Primeira missão</span></button></Palco></div>
      <div className="next">
        <button className="tip facebtn" data-tip="Esforço alvo de hoje: aparece depois de montar o protocolo."><img className="face bob" src={FACE[10]} width={48} height={74} alt="Doom face do esforço alvo" /></button>
        <div><h2 className="next-title">{carregado ? "Sem protocolo ainda" : "Carregando"}</h2>
          <p className="next-meta"><span>Monte o seu no Plano</span> <button className="tip pill" data-tip="Os treinos aparecem aqui depois que o protocolo for montado."><span>primeira missão</span></button></p></div>
      </div>
      <button className="btn btn-primary" onClick={() => navegar("/plano")}>Montar protocolo</button>
      <div className="week"><Slots feitos={pr.feitosNaSemana} meta={meta} /></div>
    </>;
  }

  const lista = paraTreino(r, t.exercicios, bib);
  const en = t.exercicios[0]!, L = bib[en.id], eq = eqDe(en);
  const ult0 = ultimoDe(en), sg = sugestao(en.series, ult0, eq);
  const kg = sg.kg ?? EQUIPAMENTOS[eq].cargaInicial;
  const sobem = t.exercicios.filter(e => { const u = ultimoDe(e); return u && sugestao(e.series, u, eqDe(e)).sobe; });
  const novos = t.exercicios.filter(e => !ultimoDe(e)).length;
  const s0 = en.series[0]!, gAlvo = s0.tipo === "NORMAL" ? s0.ger : 10;
  const alvoTxt = GER[gAlvo]!.reserva.replace(" na reserva", " sobrando");

  const titulo = prox.hoje ? "Próxima: " + nome : prox.feitoHoje ? "Treino de hoje feito" : "Hoje é descanso";
  const metaTxt = prox.hoje ? `${lista.length} exercícios, cerca de ${estimativaMin(lista)} min` : `Próximo: ${nome}, ${quando(prox.emDias)}`;
  const ups = novos === t.exercicios.length ? "carga na hora" : sobem.length ? `${sobem.length} ${sobem.length > 1 ? "cargas sobem" : "carga sobe"}` : "cargas mantidas";
  const upsTip = novos === t.exercicios.length
    ? "Primeira vez nesses exercícios: o app pergunta a carga de cada um e guarda como referência."
    : sobem.map(e => `${bib[e.id]?.nome ?? e.id}: ${fmt(ultimoDe(e)!.kg)} para ${fmt(sugestao(e.series, ultimoDe(e), eqDe(e)).kg!)} ${unidade(eqDe(e))}`).join(". ") || "Nenhum exercício chegou ao topo da faixa em todas as séries.";
  const regra = volta ?? (!prox.hoje
    ? (prox.feitoHoje ? `Descanse. ${nome} fica para ${quando(prox.emDias)}.`
      : !total ? "Sua fase começa no primeiro treino, então pular hoje não conta como falta."
      : `Descanso no seu protocolo. Se der vontade, dá para adiantar ${nome}.`)
    : null);
  const botao = volta && prox.hoje ? "Recomeçar pela sessão " + nome : prox.hoje ? "Começar " + nome : prox.feitoHoje ? `Adiantar ${nome}` : "Treinar hoje mesmo assim";
  const face = volta ? 7 : 10;

  return <>
    <div className="topbar"><div className="mark">Overload</div><div className="row" style={{ gap: 6 }}>
      <button className="tip chip map" data-tip={total ? `Fase 1 do protocolo, sessão ${total + 1}.` : "Primeira missão da fase 1."}>Episódio <b>1</b> · Missão <b>{total + 1}</b></button></div></div>
    <div className="hero">
      <Palco eq={eq} kg={kg} pilha={L?.pilhaKg}>
        <button className="load tip" data-tip={sg.kg != null ? `${L?.nome}. ${sg.porque}` : `${L?.nome}: primeira vez. A carga é perguntada no começo do exercício.`}>
          <span className="kg">{sg.kg != null ? fmt(kg) : "?"}</span><span className="u">{sg.kg != null ? unidade(eq) : ""}</span><span className="ex">{L?.nome}</span>
        </button>
      </Palco>
    </div>
    <div className="next">
      <button className="tip facebtn" data-tip={`Esforço alvo de hoje: ${GER[gAlvo]!.titulo}. Termine cada série com ${alvoTxt}.`}><img className="face bob" src={FACE[face]} width={48} height={74} alt="Doom face do esforço alvo" /></button>
      <div>
        <h2 className="next-title">{titulo}</h2>
        <p className="next-meta"><span>{metaTxt}</span> <button className="tip pill" data-tip={upsTip}><span>{ups}</span></button></p>
      </div>
    </div>
    {regra && <p className="state">{regra}</p>}
    <button className={`btn ${prox.hoje ? "btn-primary" : "btn-ghost"}`} onClick={() => navegar("/treino", { state: { dia: t.i } })}>{botao}</button>
    <div className="week">
      <Slots feitos={pr.feitosNaSemana} meta={meta} />
      <button className="tip infobtn" aria-label="Sobre a meta da semana"
        data-tip={`Cada sessão feita vira uma keycard. A meta é ${meta} por semana, em qualquer dia; a sessão a mais é bônus e não aumenta a meta seguinte. A meta é parte da camada de aderência, configurada ao montar o protocolo.`}><Pix nome="info" w={16} /></button>
    </div>
  </>;
}


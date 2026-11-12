// Rascunho do protocolo no montador, portado de design/mock/plano-simples.js e plano-montador.js.
// Sem React: entra e sai dado, para os testes rodarem no Node. A tela (Montador.tsx) só desenha.
import { RAMPAS, estimativaMin, preparo } from "../../domain/preparo.ts";
import { EQUIPAMENTOS } from "../../domain/equipamento.ts";
import { GER } from "../../domain/ger.ts";
import { cap, faixaTxt, fmt, juntar } from "../../domain/texto.ts";
import type { CamadaDeAderencia, Equipamento, ExercicioDoPlano, ExercicioDoTreino, Faixa, ItemDaBiblioteca, ModoAgenda, Serie } from "../../domain/tipos.ts";
import { MUSCULOS } from "../../domain/tipos.ts";

export const DIAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;
export const DIAN = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;

/* Item da biblioteca como o montador usa: o do domínio, mais o tamanho da pilha. */
export interface Item extends ItemDaBiblioteca { pilhaKg?: number | null }
export type Bib = Readonly<Record<string, Item>>;

/* Exercício no rascunho. uid identifica a linha (e vira o id do exercício no servidor). */
export interface Ex extends ExercicioDoPlano { uid: string; acessorios: string[]; misto?: boolean }
export interface Dia { folga: boolean; exercicios: Ex[] }
export interface Sessao { nome: string; parte: string; exercicios: Ex[] }

export interface Rascunho {
  agenda: ModoAgenda;
  descanso: number;
  descansoPreparo: number;
  camada: CamadaDeAderencia;
  dias: Dia[];
  nomes: string[];
  /* Fila de treinos do modelo: os dias marcados recebem os treinos em ordem. Montar do zero não tem fila. */
  ciclo: Sessao[] | null;
  modelo?: "ul" | "ppl";
}

export const TIPOS = {
  NORMAL: { label: "Normal", ger: null, fx: "", desc: "Série reta dentro da faixa de repetições, com a reserva do protocolo. A carga sobe quando todas as séries chegam ao topo da faixa sem passar do esforço alvo." },
  REST_PAUSE: { label: "Rest-pause", ger: 12, fx: "cerca de 8", desc: "DC style rest pause: carga para cerca de 8 repetições. Bloco 1 até a falha, pausa de 20 segundos e bloco 2 até a falha. A carga sobe quando o bloco 1 chega a 10 repetições." },
  MUSCLE_ROUND: { label: "Muscle round", ger: 11, fx: "até 6 × 4", desc: "Até 6 blocos de 4 repetições com 10 segundos de pausa entre eles. Dá para falhar em qualquer bloco, e a série termina ali. O sexto bloco vai até a falha. A carga só sobe quando os 6 blocos saem completos e o sexto passa de 4 repetições." }
} as const;
export type Tipo = keyof typeof TIPOS;

export const RRP: readonly { rr: Faixa; t: string; s: string }[] = [
  { rr: [4, 6], t: "Força", s: "4 a 6" }, { rr: [6, 8], t: "Mais peso", s: "6 a 8" },
  { rr: [8, 10], t: "Equilíbrio", s: "8 a 10" }, { rr: [10, 12], t: "Mais reps", s: "10 a 12" }
];
export const TSHORT: Record<Tipo, string> = {
  NORMAL: "Faixa de repetições e quanto sobra", REST_PAUSE: "Até a falha, pausa curta e mais um bloco", MUSCLE_ROUND: "Até 6 blocos de 4 com pausas curtas"
};
export const GRUPOS: readonly (readonly [string, readonly string[]])[] = [
  ["Peito", ["PEITO"]], ["Costas", ["COSTAS"]], ["Ombros", ["OMBROS"]], ["Bíceps", ["BÍCEPS"]], ["Tríceps", ["TRÍCEPS"]],
  ["Pernas", ["QUADRÍCEPS", "POSTERIOR", "GLÚTEOS", "ADUTORES"]], ["Panturrilha", ["PANTURRILHA"]]
];
export const GERL: Record<number, string> = { 7: "4 a 6", 8: "2 a 3", 9: "1", 10: "Falha" };

/* ---------- construtores, como no mock ---------- */
const novoUid = () => crypto.randomUUID();
export const N = (ger: number, rr: Faixa = [8, 12]): Serie => ({ tipo: "NORMAL", ger, faixa: [rr[0], rr[1]] });
export const T = (tipo: "REST_PAUSE" | "MUSCLE_ROUND"): Serie => ({ tipo });
export function E(bib: Bib, id: string, series: Serie[], prep: ExercicioDoPlano["preparo"] = "auto", acc: string[] | null = null, descanso: number | null = null): Ex {
  return { uid: novoUid(), id, series, preparo: prep, acessorios: acc ?? (bib[id]?.acessorios ?? []).slice(), descanso, descansoPreparo: null };
}

/* séries dos modelos: a primeira deixa 2 a 3 na reserva e a última 1; isolados de máquina com série única vão até a falha */
const C2 = (rr?: Faixa) => [N(8, rr ?? [6, 8]), N(9, rr ?? [6, 8])], Mc2 = () => [N(8, [8, 10]), N(9, [8, 10])];
export const M2 = () => [N(8, [10, 12]), N(9, [10, 12])];
const M3 = () => [N(8, [10, 12]), N(8, [10, 12]), N(9, [10, 12])], I1 = () => [N(10, [10, 12])];
const ISO = 90;
const vezes = (n: number) => `${n} ${n === 1 ? "vez" : "vezes"}`;

interface Modelo {
  nome: string; sub: string; alvos: number[]; padrao: number[]; porque: string;
  partes: Record<string, (n: number) => string>;
  ciclo(bib: Bib): Sessao[];
}
export const MODELOS: Record<"ul" | "ppl", Modelo> = {
  ul: {
    nome: "Superior e inferior", sub: "4 dias por semana. Cada parte do corpo treina 2 vezes.", alvos: [4], padrao: [0, 1, 3, 4],
    porque: "Nele, cada parte do corpo treina 2 vezes por semana, com pelo menos um dia de descanso antes de repetir.",
    partes: { cima: n => `a parte de cima treina ${vezes(n)}`, baixo: n => `a parte de baixo treina ${vezes(n)}` },
    ciclo: b => {
      const Ei = (id: string, s: Serie[]) => E(b, id, s, "auto", null, ISO);
      return [
        { nome: "Superior A", parte: "cima", exercicios: [E(b, "sup", C2()), E(b, "pux", C2()), E(b, "dev", Mc2()), Ei("elev", I1()), Ei("pul", I1()), Ei("scott", M2())] },
        { nome: "Inferior A", parte: "baixo", exercicios: [E(b, "hack", C2()), E(b, "stiff", C2([8, 10])), Ei("ext", I1()), Ei("pants", M2())] },
        { nome: "Superior B", parte: "cima", exercicios: [E(b, "supH", C2()), E(b, "tbar", C2()), Ei("pecfly", M2()), Ei("crucr", I1()), Ei("paral", I1()), Ei("scott", I1())] },
        { nome: "Inferior B", parte: "baixo", exercicios: [E(b, "leg45", C2()), Ei("flex", M2()), Ei("extr", I1()), Ei("adut", I1()), Ei("pantp", M2())] }
      ];
    }
  },
  ppl: {
    nome: "Empurrar, puxar e pernas", sub: "3 dias por semana. Em 6 dias, o ciclo roda 2 vezes.", alvos: [3, 6], padrao: [0, 2, 4],
    porque: "Nele, cada treino trabalha uma parte diferente do corpo, e a mesma parte sempre descansa pelo menos um dia antes de voltar.",
    partes: { emp: n => `empurrar entra ${vezes(n)}`, pux: n => `puxar entra ${vezes(n)}`, per: n => `pernas entra ${vezes(n)}` },
    ciclo: b => {
      const Ei = (id: string, s: Serie[]) => E(b, id, s, "auto", null, ISO);
      return [
        { nome: "Empurrar", parte: "emp", exercicios: [E(b, "sup", C2()), E(b, "dev", Mc2()), Ei("pecfly", M2()), Ei("elev", I1()), Ei("pul", M2()), Ei("paral", I1())] },
        { nome: "Puxar", parte: "pux", exercicios: [E(b, "pux", C2()), E(b, "tbar", Mc2()), Ei("crucr", I1()), Ei("scott", M3())] },
        { nome: "Pernas", parte: "per", exercicios: [E(b, "hack", C2()), E(b, "stiff", C2([8, 10])), Ei("ext", M2()), Ei("flex", M2()), Ei("pantp", M2()), Ei("pants", M2())] }
      ];
    }
  }
};

export const vazio = (): Rascunho => ({
  agenda: "semana", descanso: 120, descansoPreparo: 40,
  camada: { fase: true, semanas: 6, meta: true, metaN: 3, nuncaDuas: true },
  dias: Array.from({ length: 7 }, () => ({ folga: true, exercicios: [] })), nomes: ["", "", "", "", "", "", ""], ciclo: null
});

export function doModelo(k: "ul" | "ppl", bib: Bib, mascara?: boolean[]): Rascunho {
  const M = MODELOS[k], d = vazio();
  d.dias.forEach((x, i) => { x.folga = mascara ? !mascara[i] : !M.padrao.includes(i); });
  d.modelo = k;
  d.ciclo = M.ciclo(bib);
  d.camada.metaN = Math.max(1, Math.min(5, d.dias.filter(x => !x.folga).length));
  return d;
}

export const diasDeTreino = (d: Rascunho, mapa?: boolean[]) => (mapa ?? d.dias.map(x => !x.folga)).map((v, i) => v ? i : -1).filter(i => i >= 0);
const clonar = (exs: Ex[]): Ex[] => exs.map(e => ({ ...e, uid: novoUid(), series: e.series.map(s => ({ ...s })) as Serie[], acessorios: e.acessorios.slice() }));

/* Os dias marcados recebem os treinos da fila em ordem; a fila recomeça quando acaba. */
export function sincronizarDias(d: Rascunho): void {
  const c = d.ciclo;
  if (!c) return;
  let n = 0;
  d.dias.forEach((x, i) => {
    if (x.folga) { x.exercicios = []; d.nomes[i] = ""; }
    else { const s = c[n % c.length]!; x.exercicios = clonar(s.exercicios); d.nomes[i] = s.nome; n++; }
  });
}

export const nomeDoDia = (d: Rascunho, i: number) => DIAN[i] + (d.nomes[i] ? ` · ${d.nomes[i]}` : "");

/* Mesma parte do corpo em dois dias seguidos, simulando 3 semanas (no dia fixo, domingo e segunda contam). */
export function conflitosDeDescanso(d: Rascunho, modo: ModoAgenda, t = diasDeTreino(d)): string[] {
  const c = d.ciclo;
  if (!c || !t.length) return [];
  const seq: { abs: number; s: number }[] = [];
  let n = 0;
  for (let w = 0; w < 3; w++) t.forEach((i, k) => { seq.push({ abs: w * 7 + i, s: modo === "sequencia" ? n++ % c.length : k % c.length }); });
  const out: string[] = [];
  for (let q = 1; q < seq.length; q++) {
    const a = seq[q - 1]!, b = seq[q]!;
    if (b.abs - a.abs === 1 && c[a.s]!.parte === c[b.s]!.parte) {
      const chave = `${DIAN[a.abs % 7]!.toLowerCase()} e ${DIAN[b.abs % 7]!.toLowerCase()}`;
      if (!out.includes(chave)) out.push(chave);
    }
  }
  return out;
}

export function melhorMascara(d: Rascunho, alvo: number): boolean[] | null {
  const cur = d.dias.map(x => !x.folga), X = cur.filter(Boolean).length;
  let best: { on: boolean[]; sc: number[] } | null = null;
  for (let m = 0; m < 128; m++) {
    const on = [0, 1, 2, 3, 4, 5, 6].map(i => !!(m >> i & 1));
    if (on.filter(Boolean).length !== alvo) continue;
    if (X > alvo ? on.some((v, i) => v && !cur[i]) : on.some((v, i) => !v && cur[i])) continue;
    const t = diasDeTreino(d, on), gaps = t.map((x, q) => ((t[(q + 1) % t.length]! - x + 7) % 7) || 7);
    const sc = [conflitosDeDescanso(d, "semana", t).length, -Math.min(...gaps), Math.max(...gaps)];
    const melhor = !best || sc[0]! < best.sc[0]! || (sc[0] === best.sc[0] && (sc[1]! < best.sc[1]! || (sc[1] === best.sc[1] && sc[2]! < best.sc[2]!)));
    if (melhor) best = { on, sc };
  }
  return best && best.on;
}

export function cabe(d: Rascunho): boolean {
  const c = d.ciclo, M = d.modelo && MODELOS[d.modelo], X = diasDeTreino(d).length;
  return !c || !M || !X || (M.alvos.includes(X) && !conflitosDeDescanso(d, d.agenda).length);
}
export function precisaAviso(d: Rascunho): boolean {
  const c = d.ciclo, M = d.modelo && MODELOS[d.modelo], X = diasDeTreino(d).length;
  if (!c || !M || !X) return false;
  if (X === 7) return true;
  if (d.agenda === "sequencia") return conflitosDeDescanso(d, "sequencia").length > 0;
  return !cabe(d);
}

/* Aviso de dias diferentes do modelo (o modal do mock), como dado para a tela desenhar. */
export interface AvisoDeDias {
  titulo: string; cabecalho: string; porque: string; semDescanso: boolean; fila: string; filaLista: { dia: string; nome: string }[];
  proxima: string; fixo: string | null; mascara: boolean[] | null; rotuloMascara: string | null; trocarParaPpl: boolean;
}
export function avisoDeDias(d: Rascunho): AvisoDeDias | null {
  const c = d.ciclo, M = d.modelo && MODELOS[d.modelo];
  if (!c || !M) return null;
  const t = diasDeTreino(d), X = t.length, n = c.length;
  if (!X || !precisaAviso(d)) return null;
  const alvo = M.alvos.reduce((a, b) => Math.abs(b - X) < Math.abs(a - X) ? b : a);
  const hi = Math.max(...M.alvos), lo = Math.min(...M.alvos);
  const titulo = X === 7 ? "Sem dia de descanso" : M.alvos.includes(X) ? "Descanso entre treinos"
    : X > hi || (X > lo && M.alvos.length === 1) ? "Mais dias que o modelo" : X < lo ? "Menos dias que o modelo" : "Dias diferentes do modelo";
  const fila = conflitosDeDescanso(d, "sequencia", t);
  const filaTxt = `${d.agenda === "sequencia" ? "Você já está em fila." : "Sugestão: seguir em fila."}|Os treinos seguem em ordem nos dias marcados e recomeçam quando acabam${fila.length ? `, mas a mesma parte do corpo ainda treinaria em dias seguidos (${juntar(fila)})` : ", então nenhuma parte do corpo treina em dois dias seguidos"}.${X > alvo && X < 7 ? " Com mais dias, o volume da semana sobe um pouco." : X < alvo ? " Com menos dias, a volta completa leva mais de uma semana." : ""}`;
  let fixo: string | null = null;
  if (d.agenda === "semana") {
    const cnt: Record<string, number> = {}, vistos = new Set<number>();
    Object.keys(M.partes).forEach(p => { cnt[p] = 0; });
    t.forEach((_, k) => { cnt[c[k % n]!.parte]!++; vistos.add(k % n); });
    const faltam = c.filter((_, s) => !vistos.has(s)).map(s => s.nome), presos = conflitosDeDescanso(d, "semana", t);
    const desigual = new Set(Object.values(cnt)).size > 1;
    if (desigual || faltam.length || presos.length) fixo = `Se cada treino ficar preso no seu dia, ${[
      desigual ? "toda semana " + juntar(Object.keys(M.partes).map(p => M.partes[p]!(cnt[p]!))) : "",
      faltam.length ? `${juntar(faltam)} nunca ${faltam.length > 1 ? "entrariam" : "entraria"} na semana` : "",
      presos.length ? `a mesma parte do corpo treinaria em dias seguidos (${juntar(presos)})` : ""
    ].filter(Boolean).join(", e ")}.`;
  }
  const best = melhorMascara(d, alvo);
  const diff = best ? diasDeTreino(d, X > alvo ? d.dias.map((x, i) => !x.folga && !best[i]) : best.map((v, i) => v && d.dias[i]!.folga)) : [];
  return {
    titulo,
    cabecalho: `Você marcou ${X} ${X > 1 ? "dias" : "dia"}, e este modelo foi feito para ${M.alvos.join(" ou ")}.`,
    porque: M.porque, semDescanso: X === 7, fila: filaTxt,
    filaLista: t.map((i, k) => ({ dia: DIAS[i]!, nome: c[k % n]!.nome })),
    proxima: `Na semana seguinte, começa por ${c[X % n]!.nome}.`,
    fixo,
    mascara: best && diff.length ? best : null,
    rotuloMascara: best && diff.length ? (X > alvo ? `Voltar para ${alvo} dias: tirar ${juntar(diff.map(i => DIAN[i]!.toLowerCase()))}` : `Completar ${alvo} dias: incluir ${juntar(diff.map(i => DIAN[i]!.toLowerCase()))}`) : null,
    trocarParaPpl: d.modelo === "ul" && X === 3
  };
}

/* ---------- séries iguais, escada e "cada série de um jeito" ---------- */
const mesmaSerie = (a: Serie, b: Serie) => a.tipo === b.tipo && (a.tipo !== "NORMAL" || (b.tipo === "NORMAL" && a.faixa[0] === b.faixa[0] && a.faixa[1] === b.faixa[1] && a.ger === b.ger));
const mesmaForma = (a: Serie, b: Serie) => a.tipo === b.tipo && (a.tipo !== "NORMAL" || (b.tipo === "NORMAL" && a.faixa[0] === b.faixa[0] && a.faixa[1] === b.faixa[1]));
/* escada: todas as séries iguais, menos a última, que deixa uma faixa a menos na reserva */
export function escada(e: Ex): boolean {
  const z = e.series, n = z.length, a = z[0];
  if (n < 2 || !a || a.tipo !== "NORMAL") return false;
  const ult = z[n - 1]!;
  return z.every(x => mesmaForma(x, a)) && z.slice(0, -1).every(x => x.tipo === "NORMAL" && x.ger === a.ger) && ult.tipo === "NORMAL" && ult.ger === a.ger + 1;
}
export const uniforme = (e: Ex) => e.series.every(x => mesmaSerie(x, e.series[0]!)) || escada(e);
export function setEscada(e: Ex, g: number, on: boolean): void {
  e.series.forEach((x, j) => { if (x.tipo === "NORMAL") x.ger = on && j === e.series.length - 1 && g < 10 ? g + 1 : g; });
}
export const misto = (e: Ex) => e.series.length > 1 && (!!e.misto || !uniforme(e));
export const alcance = (e: Ex, serieAberta: number) => misto(e) ? [Math.min(serieAberta, e.series.length - 1)] : e.series.map((_, j) => j);

export const descansoTxt = (r: number) => r >= 60 ? (r % 60 ? fmt(r / 60) + " min" : r / 60 + " min") : r + " s";
const reservaCurta = (g: number) => GER[g]!.alvo.replace(" na reserva", "");
export const serieCurta = (s: Serie) => s.tipo !== "NORMAL" ? TIPOS[s.tipo].label.toLowerCase()
  : `${faixaTxt(s.faixa)}, ${s.ger >= 10 ? GER[s.ger]!.alvo.toLowerCase() : "sobrando " + reservaCurta(s.ger)}`;

/* ---------- lista do treino como o domínio usa ---------- */
export function paraTreino(d: Rascunho, exs: readonly Ex[], bib: Bib): ExercicioDoTreino[] {
  return exs.map(e => {
    const L = bib[e.id];
    return {
      musculo: L?.musculo ?? "CORE", acessorios: e.acessorios, equipamento: (L?.equipamento ?? "pilha") as Equipamento,
      series: e.series, preparo: e.preparo, descanso: e.descanso ?? d.descanso, descansoPreparo: e.descansoPreparo ?? d.descansoPreparo
    };
  });
}

/* Resumo da linha do exercício: bolinhas do preparo e das válidas, e o total que quem vem do "4 × 10 a 12" compara. */
export function resumoDoEx(d: Rascunho, exs: readonly Ex[], k: number, bib: Bib): { preparo: number; validas: number; texto: string } {
  const e = exs[k]!, z = e.series, n = z.length, a = z[0]!, p = preparo(paraTreino(d, exs, bib), k).n;
  const sets = uniforme(e) ? (a.tipo === "NORMAL" ? faixaTxt(a.faixa) : TIPOS[a.tipo].label.toLowerCase())
    : z.map(x => x.tipo === "NORMAL" ? faixaTxt(x.faixa) : TIPOS[x.tipo].label.toLowerCase()).join(" + ");
  const head = p ? `${p + n} séries: ${p} de aquecimento + ${n} ${n > 1 ? "válidas" : "válida"}` : `${n} ${n > 1 ? "séries válidas" : "série válida"}`;
  return { preparo: p, validas: n, texto: `${head} · ${sets}` };
}

/* Como fica no treino: o fluxo de preparo e séries do exercício aberto, e o porquê do preparo. */
export function fluxo(d: Rascunho, exs: readonly Ex[], k: number, bib: Bib) {
  const pi = preparo(paraTreino(d, exs, bib), k), nivel = (pct: number) => pct < .65 ? "leve" : pct < .8 ? "médio" : "quase";
  return {
    preparos: RAMPAS[pi.n]!.map(r => `${nivel(r[0])}, ${Math.round(r[0] * 100)}% · ${r[1]}`),
    series: exs[k]!.series.map(x => x.tipo === "NORMAL" ? `${faixaTxt(x.faixa)} · ${x.ger >= 10 ? "até a falha" : "reserva " + reservaCurta(x.ger)}` : TIPOS[x.tipo].label),
    porque: `${pi.n ? `Preparo é o aquecimento: séries leves que o app coloca sozinho antes das válidas. ${pi.porque}` : `Sem aquecimento aqui. ${pi.porque}`} Séries válidas são as que vão perto da falha e contam para a carga subir.`,
    info: pi
  };
}

export const equipamentoTxt = (L: Item, ) => {
  const E = EQUIPAMENTOS[L.equipamento];
  return `${E.nome}: ${E.descricao}.${L.equipamento === "pilha" ? ` Pilha desta máquina: ${L.pilhaKg ?? 100} kg.` : ""}`;
};

/* Alertas da revisão: grupos com menos de 4 séries na semana, dias vazios ou acima de 60 minutos e dias seguidos. */
export function alertasDaSemana(d: Rascunho, bib: Bib): string[] {
  const v: Record<string, number> = {};
  MUSCULOS.forEach(m => { v[m] = 0; });
  d.dias.forEach(x => { if (x.folga) return; x.exercicios.forEach(e => { const m = bib[e.id]?.musculo; if (m) v[m]! += e.series.length; e.acessorios.forEach(a => { v[a]! += .5 * e.series.length; }); }); });
  const out: string[] = [];
  GRUPOS.forEach(([g, ms]) => {
    const n = ms.reduce((a, m) => a + v[m]!, 0);
    if (n === 0) out.push(`${g} não tem nenhuma série na semana.`);
    else if (n < 4) out.push(`${g} soma ${fmt(n)} ${n === 1 ? "série" : "séries"} na semana, abaixo das 4 que o protocolo usa como mínimo.`);
  });
  diasDeTreino(d).forEach(i => {
    const x = d.dias[i]!;
    if (!x.exercicios.length) out.push(`${DIAN[i]} está marcada como treino, mas não tem exercício.`);
    else { const m = estimativaMin(paraTreino(d, x.exercicios, bib)); if (m > 60) out.push(`${DIAN[i]} passa de 60 minutos (cerca de ${m}).`); }
  });
  if (d.ciclo) { const r = conflitosDeDescanso(d, d.agenda); if (r.length) out.push(`A mesma parte do corpo treina em dias seguidos (${juntar(r)}).`); }
  return out;
}

export function revisaoDoDia(d: Rascunho, i: number, bib: Bib) {
  const l = paraTreino(d, d.dias[i]!.exercicios, bib);
  const series = l.reduce((a, e) => a + e.series.length, 0), preparos = l.reduce((a, _, k) => a + preparo(l, k).n, 0);
  return { n: l.length, series, preparos, min: l.length ? estimativaMin(l) : 0 };
}

/* ---------- ida e volta com a API ---------- */
export interface ProtocoloDaApi {
  id?: string; versao: number | null; agenda: ModoAgenda; descanso: number; descansoPreparo: number; fila?: number;
  camada: CamadaDeAderencia;
  dias: { folga: boolean; nome: string; exercicios: (Omit<ExercicioDoPlano, "id"> & { id: string; bibliotecaId: string | null; nome?: string | null; musculo?: string | null; equipamento?: string | null; apelido?: string | null })[] }[];
  biblioteca?: Record<string, { nome: string; nomePt: string | null; musculo: string; acessorios: string[]; equipamento: Equipamento; pilhaKg: number | null; instrucoesPt: string[] | null; instrucoes: string[]; gifUrl: string | null }>;
}

export function paraApi(d: Rascunho, versao: number | null): ProtocoloDaApi {
  const usados = new Set<string>();
  return {
    versao, agenda: d.agenda, descanso: d.descanso, descansoPreparo: d.descansoPreparo, camada: { ...d.camada },
    dias: d.dias.map((x, i) => ({
      folga: x.folga, nome: x.folga ? "" : d.nomes[i] ?? "",
      exercicios: x.folga ? [] : x.exercicios.map(e => {
        // O id do exercício é único no servidor: um treino que se repete na semana ganha um id por dia.
        const id = usados.has(e.uid) ? crypto.randomUUID() : e.uid;
        usados.add(id);
        return { id, bibliotecaId: e.id, series: e.series, preparo: e.preparo, acessorios: e.acessorios, descanso: e.descanso, descansoPreparo: e.descansoPreparo };
      })
    }))
  };
}

export function daApi(p: ProtocoloDaApi): Rascunho {
  return {
    agenda: p.agenda, descanso: p.descanso, descansoPreparo: p.descansoPreparo, camada: { ...p.camada }, ciclo: null,
    nomes: p.dias.map(x => x.nome ?? ""),
    dias: p.dias.map(x => ({
      folga: x.folga,
      exercicios: x.exercicios.filter(e => e.bibliotecaId).map(e => ({
        uid: e.id, id: e.bibliotecaId!, series: e.series, preparo: e.preparo,
        acessorios: e.acessorios ?? p.biblioteca?.[e.bibliotecaId!]?.acessorios ?? [], descanso: e.descanso, descansoPreparo: e.descansoPreparo
      }))
    }))
  };
}

export const bibDaApi = (p: ProtocoloDaApi): Record<string, Item> => Object.fromEntries(Object.entries(p.biblioteca ?? {}).map(([id, i]) => [id, {
  nome: i.nomePt || i.nome, musculo: i.musculo, acessorios: i.acessorios, equipamento: i.equipamento, pilhaKg: i.pilhaKg
}]));

export const capM = cap;

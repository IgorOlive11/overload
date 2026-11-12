// A sessão de treino como no mock (design/mock/sessao.js): passos em fila (calibração, preparo e séries válidas),
// o resultado de cada passo, o corte do preparo, o julgamento do exercício ao terminar e o descanso entre passos.
// Sem React e sem banco: quem chama guarda o estado e transforma os passos feitos em registros.
import { arredondar, EQUIPAMENTOS, unidade } from "./equipamento.ts";
import { nivel } from "./ger.ts";
import { descansoAntes, passos, type Passo } from "./preparo.ts";
import { cartao, julgar, type Cartao } from "./progressao.ts";
import { faixaTxt, fmt } from "./texto.ts";
import type { Equipamento, ExercicioDoTreino, Registro, Resultado, Serie } from "./tipos.ts";

export interface ExercicioDaSessao {
  /* Id do exercício no protocolo e o id da biblioteca. */
  uid: string;
  id: string;
  nome: string;
  pilhaKg: number | null;
  chave: string;
  configuracao: string;
  ultimo: Registro | null;
  treino: ExercicioDoTreino;
}

/* O que a pessoa marcou num passo. Calibração: a carga. Preparo: carga e repetições. Válida: o resultado da série. */
export type ResultadoDoPasso = (Resultado & { kg?: number }) | { kg: number };

export interface Trabalho { kg: number; cartao: Cartao; sobe: boolean; feito: boolean; proxima: number }

export interface Descanso { fim: number; dur: number; tipo: string; prox: string }

export interface EstadoDaSessao {
  id: string;
  titulo: string;
  dia: number;
  indiceTreino: number;
  protocoloId: string | null;
  protocoloVersao: number | null;
  diaLocal: string;
  inicio: number;
  lista: ExercicioDaSessao[];
  passos: Passo[];
  wk: Trabalho[];
  res: Record<number, ResultadoDoPasso>;
  pulados: Record<number, true>;
  i: number;
  validas: number;
  preparos: number;
  sobem: number;
  descanso: Descanso | null;
}

export interface Dados {
  id: string; titulo: string; dia: number; indiceTreino: number; protocoloId: string | null; protocoloVersao: number | null;
  diaLocal: string; inicio: number; diasParado: number; lista: ExercicioDaSessao[];
}

export function iniciar(d: Dados): EstadoDaSessao {
  const { diasParado, ...resto } = d;
  return {
    ...resto,
    passos: passos(d.lista.map(e => e.treino)),
    wk: d.lista.map(e => {
      const c = cartao(e.treino.series, e.ultimo, e.treino.equipamento, diasParado);
      return { kg: c.kg, cartao: c, sobe: false, feito: false, proxima: c.kg };
    }),
    res: {}, pulados: {}, i: 0, validas: 0, preparos: 0, sobem: 0, descanso: null
  };
}

export const eqDe = (s: EstadoDaSessao, k: number): Equipamento => s.lista[k]!.treino.equipamento;
export const kgDoPreparo = (s: EstadoDaSessao, k: number, fracao: number) => arredondar(s.wk[k]!.kg * fracao, eqDe(s, k));
export const indicesValidos = (s: EstadoDaSessao, k: number) => s.passos.map((p, i) => p.k === k && p.tipo === "TRABALHO" ? i : -1).filter(i => i >= 0);
export const primeiroNumero = (t: string) => parseInt(t, 10) || 0;

/* Corte do preparo da v1: se a carga arredondada já é a de trabalho e as repetições alcançam o mínimo da série normal,
   o preparo é pulado. O primeiro preparo nunca. */
export function deveCortar(s: EstadoDaSessao, n: number): boolean {
  const p = s.passos[n];
  if (!p || p.tipo !== "PREPARO" || p.j === 0) return false;
  const serie = s.lista[p.k]!.treino.series[0]!;
  const minimo = serie.tipo === "NORMAL" ? serie.faixa[0] : Infinity;
  return kgDoPreparo(s, p.k, p.fracao) >= s.wk[p.k]!.kg && primeiroNumero(p.faixa) >= minimo;
}

/* Texto do descanso: o tipo e o que vem depois. */
export function textoDoDescanso(s: EstadoDaSessao, prox: Passo): { tipo: string; prox: string } {
  const e = s.lista[prox.k]!, u = unidade(e.treino.equipamento);
  if (prox.tipo === "PREPARO") return { tipo: "Descanso do preparo", prox: `Próximo: preparo ${prox.j + 1} de ${prox.n}, ${fmt(kgDoPreparo(s, prox.k, prox.fracao))} ${u}. Leve, só para aquecer o movimento.` };
  if (prox.tipo !== "TRABALHO") return { tipo: "Descanso", prox: "" };
  const z = prox.serie;
  const dica = z.tipo === "NORMAL" ? `Busque ${z.faixa[1]} repetições deixando ${nivel(z.ger).reserva}.` : z.tipo === "REST_PAUSE" ? "Bloco 1 até a falha, 20 segundos, bloco 2 até a falha." : "Blocos de 4 repetições com 10 segundos entre eles.";
  return { tipo: "Descanso", prox: `Próxima: série ${prox.j + 1} de ${e.treino.series.length}, ${TIPO_TXT[z.tipo].toLowerCase()}, ${fmt(s.wk[prox.k]!.kg)} ${u}. ${dica}` };
}

export const TIPO_TXT = { NORMAL: "Normal", REST_PAUSE: "Rest-pause", MUSCLE_ROUND: "Muscle round" } as const;

export interface Aviso { titulo: string; sub: string; face: number; bom: boolean; flash?: "pickup" | "pain" }

/* Julga o exercício pelas séries válidas de hoje: sobe quando todas bateram a regra. */
export function julgarExercicio(s: EstadoDaSessao, k: number, quieto = false): Aviso | null {
  const e = s.lista[k]!, w = s.wk[k]!, eq = e.treino.equipamento, u = unidade(eq);
  const js = e.treino.series.map((z, j) => julgar(z, s.res[indicesValidos(s, k)[j]!] as Resultado | undefined, w.kg, eq));
  const antes = w.sobe;
  w.feito = true;
  w.sobe = js.every(j => j.ok);
  w.proxima = w.sobe ? w.kg + EQUIPAMENTOS[eq].incremento : w.kg;
  s.sobem += (w.sobe ? 1 : 0) - (antes ? 1 : 0);
  if (quieto) return null;
  if (w.sobe) return { titulo: `Progressão: ${e.nome}`, sub: `Bateu a regra. Na próxima vez, ${fmt(w.proxima)} ${u}.`, face: 13, bom: true, flash: "pickup" };
  const falta = js.find(j => !j.ok)!;
  return { titulo: `${e.nome}: mantém ${fmt(w.kg)} ${u}`, sub: `Faltou: ${falta.texto}.`, face: 9, bom: false };
}

export interface Conclusao {
  avisos: Aviso[];
  /* Segundos de descanso antes do próximo passo (0 sem descanso). */
  descanso: number;
  terminou: boolean;
  /* O exercício acabou neste passo e foi julgado. */
  julgou: boolean;
}

/* Conclui o passo atual. Muda o estado e diz o que mostrar. */
export function concluir(s: EstadoDaSessao, r: ResultadoDoPasso, agora: number): Conclusao {
  const i = s.i, p = s.passos[i]!, w = s.wk[p.k]!, e = s.lista[p.k]!, avisos: Aviso[] = [];
  s.res[i] = { ...r };
  if (p.tipo === "CALIBRACAO") w.kg = (r as { kg: number }).kg;
  if (p.tipo === "PREPARO") s.preparos++;
  if (p.tipo === "TRABALHO") {
    s.res[i] = { ...r, kg: w.kg };
    s.validas++;
    const u = unidade(e.treino.equipamento);
    const ult = e.ultimo, ant = ult?.resultados[p.j];
    if (p.serie.tipo === "NORMAL" && ult && ant && "reps" in ant && "reps" in r) {
      if (w.kg > ult.kg ? r.reps >= ant.reps : w.kg === ult.kg && r.reps > ant.reps)
        avisos.push({ titulo: "Recorde nesta série", sub: `${r.reps} repetições com ${fmt(w.kg)} ${u}. Da última vez foram ${ant.reps} com ${fmt(ult.kg)}.`, face: 13, bom: true, flash: "pickup" });
    } else if (p.serie.tipo === "MUSCLE_ROUND" && "blocos" in r && r.blocos >= 6 && r.ultimo > 4) {
      avisos.push({ titulo: "Muscle round completo", sub: `Os 6 blocos saíram e o sexto teve ${r.ultimo} repetições. A carga sobe no próximo treino.`, face: 13, bom: true, flash: "pickup" });
    }
    if (!avisos.length && (p.serie.tipo !== "NORMAL" || ("ger" in r && (r.ger ?? 0) >= 10))) avisos.push({ titulo: "", sub: "", face: 0, bom: false, flash: "pain" });
  }
  let n = i + 1;
  while (n < s.passos.length && deveCortar(s, n)) { s.pulados[n] = true; delete s.res[n]; n++; }
  const prox = s.passos[n];
  const descanso = descansoAntes(p, prox, s.lista.map(x => x.treino));
  const fimDoEx = p.tipo === "TRABALHO" && (!prox || prox.k !== p.k);
  if (fimDoEx) { const a = julgarExercicio(s, p.k); if (a) avisos.push(a); }
  s.i = n;
  s.descanso = prox && descanso ? { fim: agora + descanso * 1000, dur: descanso, ...textoDoDescanso(s, prox) } : null;
  return { avisos: avisos.filter(a => a.titulo || a.flash), descanso, terminou: n >= s.passos.length, julgou: fimDoEx };
}

/* Corrige um passo já feito. A carga corrigida da calibração vale para as séries que faltam. */
export function corrigir(s: EstadoDaSessao, i: number, r: ResultadoDoPasso): Aviso {
  const p = s.passos[i]!, w = s.wk[p.k]!;
  if (p.tipo === "CALIBRACAO") { w.kg = (r as { kg: number }).kg; s.res[i] = { kg: w.kg }; }
  else s.res[i] = { ...s.res[i], ...r } as ResultadoDoPasso;
  if (w.feito) julgarExercicio(s, p.k, true);
  return { titulo: "Série atualizada", sub: p.tipo === "CALIBRACAO" ? "A carga corrigida vale para as séries que ainda faltam." : "O registro corrigido entra na regra de progressão.", face: 9, bom: false };
}

/* Pula o resto do exercício atual (só na sessão de teste). */
export function pularExercicio(s: EstadoDaSessao): boolean {
  const k = s.passos[s.i]!.k;
  let j = s.i;
  while (j < s.passos.length && s.passos[j]!.k === k) j++;
  s.i = j; s.descanso = null;
  return j >= s.passos.length;
}

/* Carga mostrada num passo: a marcada nele, ou a de trabalho, ou a do preparo. */
export function kgDoPasso(s: EstadoDaSessao, i: number): number {
  const p = s.passos[i]!, r = s.res[i] as { kg?: number } | undefined;
  if (r?.kg != null) return r.kg;
  return p.tipo === "PREPARO" ? kgDoPreparo(s, p.k, p.fracao) : s.wk[p.k]!.kg;
}

/* O resumo de um passo na linha do cartão fechado. */
export function resumoDoPasso(s: EstadoDaSessao, i: number): string {
  const p = s.passos[i]!, r = s.res[i], u = unidade(eqDe(s, p.k));
  if (s.pulados[i]) return "pulado, igual à série válida";
  if (!r) return "";
  if (p.tipo === "CALIBRACAO") return `${fmt((r as { kg: number }).kg)} ${u}`;
  if (p.tipo === "PREPARO") return `${fmt((r as { kg: number }).kg)} ${u} × ${(r as { reps: number }).reps}`;
  if ("reps" in r && p.serie.tipo === "NORMAL") return `${r.reps} reps, ${nivel(r.ger ?? p.serie.ger).sobrou}`;
  if ("b1" in r) return `${r.b1} + ${r.b2} reps`;
  if ("blocos" in r) return r.blocos >= 6 ? `6 blocos, ${r.ultimo} no sexto` : `parou no bloco ${r.blocos + 1}`;
  return "";
}

export function subtituloDoPasso(s: EstadoDaSessao, i: number): string {
  const p = s.passos[i]!, e = s.lista[p.k]!;
  if (p.tipo === "CALIBRACAO") return s.wk[p.k]!.cartao.modo === "pergunta" || i < s.i ? "Pergunta de carga" : "Carga de hoje";
  if (p.tipo === "PREPARO") return `Preparo ${p.j + 1} de ${p.n} · ${Math.round(p.fracao * 100)}%`;
  return `Série ${p.j + 1} de ${e.treino.series.length} · ${TIPO_TXT[p.serie.tipo].toLowerCase()}`;
}

/* A faixa da série em texto, como o mock (rrTxt). */
export const faixaDaSerie = (z: Serie) => z.tipo === "NORMAL" ? faixaTxt(z.faixa) : "";

/* Duração em segundos até agora. */
export const relogio = (seg: number) => String(Math.floor(seg / 60)).padStart(2, "0") + ":" + String(seg % 60).padStart(2, "0");

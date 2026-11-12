// Progresso (design/mock/progresso.js): presença por semana da fase, quantas vezes a carga subiu e a linha de carga de cada exercício.
import { presenca, type Fase } from "./presenca.ts";

export type Celula = "" | "done" | "next" | "bonus" | "bonus done";
export interface SemanaDaGrade { n: number; atual: boolean; celulas: Celula[] }

/* Uma linha por semana: as vagas da meta e a vaga de bônus. Na semana atual, a próxima vaga vazia fica marcada.
   Com a fase ligada, a grade mostra a fase inteira; sem fase, as semanas até a atual. */
export function gradeDeSemanas(dias: readonly number[], hoje: number, fase: Fase): SemanaDaGrade[] {
  const pr = presenca(dias, hoje, fase), primeiro = dias.length ? Math.min(...dias) : hoje;
  const semanaDe = (d: number) => Math.floor((d - primeiro) / 7) + 1;
  const total = fase.ligada ? Math.max(fase.semanas, pr.semana) : pr.semana;
  return Array.from({ length: total }, (_, w) => {
    const n = w + 1, feitos = dias.filter(d => semanaDe(d) === n).length, atual = n === pr.semana;
    const celulas: Celula[] = Array.from({ length: fase.meta }, (_, i) => i < feitos ? "done" : atual && i === feitos ? "next" : "");
    celulas.push(feitos > fase.meta ? "bonus done" : "bonus");
    return { n, atual, celulas };
  });
}

export interface ResumoDaFase { semana: number; feitos: number; possiveis: number; completas: number; naMeta: number }

/* "Você fez X das Y sessões possíveis até agora, fechou Z das semanas completas na meta." */
export function resumoDaFase(dias: readonly number[], hoje: number, fase: Fase): ResumoDaFase {
  const pr = presenca(dias, hoje, fase), grade = gradeDeSemanas(dias, hoje, fase);
  const completas = grade.filter(s => s.n < pr.semana);
  const naMeta = completas.filter(s => s.celulas.filter(c => c === "done").length >= fase.meta).length;
  return { semana: pr.semana, feitos: dias.length, possiveis: fase.meta * pr.semana, completas: completas.length, naMeta };
}

export interface CargaDaSessao { chave: string; configuracao: string; diaLocal: string; kg: number }

/* Quantas vezes a carga subiu: de uma sessão para a seguinte, no mesmo exercício e na mesma configuração. */
export function vezesQueSubiu(cargas: readonly CargaDaSessao[]): number {
  const ultima = new Map<string, number>();
  let n = 0;
  for (const c of cargas) {
    const k = `${c.chave}|${c.configuracao}`, antes = ultima.get(k);
    if (antes != null && c.kg > antes) n++;
    ultima.set(k, c.kg);
  }
  return n;
}

/* As cargas das últimas sessões de um exercício na configuração atual (mais antiga primeiro). */
export const ultimasCargas = (cargas: readonly CargaDaSessao[], chave: string, configuracao: string, quantas = 5) =>
  cargas.filter(c => c.chave === chave && c.configuracao === configuracao).map(c => c.kg).slice(-quantas);

// Agenda: qual treino a tela Hoje oferece. Só o próximo, pelo modo de agenda do protocolo (decisão do PO de 11/11).
import type { ModoAgenda } from "./tipos.ts";

/* Dia da semana como no mock: 0 é segunda e 6 é domingo. */
export type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const diaDaSemana = (d: Date): DiaDaSemana => ((d.getDay() + 6) % 7) as DiaDaSemana;

export interface SituacaoDaAgenda {
  modo: ModoAgenda;
  /* Os dias da semana com treino, na ordem do protocolo. O índice de cada um é o índice do treino. */
  dias: readonly number[];
  hoje: number;
  feitoHoje: boolean;
  /* Na fila, o índice do próximo treino. No dia fixo não é usado. */
  proximoDaFila: number;
}

export interface Proximo {
  indice: number;
  /* O treino é para hoje. Quando é falso, a tela mostra descanso e deixa adiantar. */
  hoje: boolean;
  /* Daqui a quantos dias o treino cabe: 0 é hoje, 1 é amanhã. */
  emDias: number;
  feitoHoje: boolean;
}

/* Na fila, o próximo da fila (amanhã, se o de hoje já foi feito). No dia fixo, o treino do dia da semana
   ou o do próximo dia de treino. Sem treino no protocolo, nada. */
export function proximoTreino(s: SituacaoDaAgenda): Proximo | null {
  const n = s.dias.length;
  if (!n) return null;
  if (s.modo === "sequencia") {
    return { indice: s.proximoDaFila, hoje: !s.feitoHoje, emDias: s.feitoHoje ? 1 : 0, feitoHoje: s.feitoHoje };
  }
  for (let d = s.feitoHoje ? 1 : 0; d < 8; d++) {
    const indice = s.dias.findIndex(x => x === (s.hoje + d) % 7);
    if (indice >= 0) return { indice, hoje: d === 0, emDias: d, feitoHoje: s.feitoHoje };
  }
  return null;
}

/* Depois de um treino feito (inteiro ou encerrado antes), a fila anda para o seguinte e recomeça no fim.
   No dia fixo, a fila não muda. */
export const filaDepois = (modo: ModoAgenda, indiceFeito: number, total: number, atual: number): number =>
  modo === "sequencia" && total > 0 ? (indiceFeito + 1) % total : atual;

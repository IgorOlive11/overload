// Presença: semana da fase, treinos na semana contra a meta, semana de ajuste e conquistas por número de treinos.
// Tudo conta a partir do primeiro treino, não da criação da conta. Os dias são números inteiros (dias corridos),
// para a regra não depender de fuso: quem chama converte a data local em dia com diaCorrido.

export const diaCorrido = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

export const SEMANA_DE_AJUSTE = 7;

export interface Presenca {
  /* Semana da fase, a partir de 1. Antes do primeiro treino, é a semana 1. */
  semana: number;
  feitosNaSemana: number;
  meta: number;
  total: number;
  /* Dias que ainda faltam da semana de ajuste. Antes do primeiro treino, a semana inteira. */
  ajusteRestante: number;
  /* Com a fase ligada, o plano trava quando acaba a semana de ajuste e destrava quando a fase termina. */
  travado: boolean;
  faseTerminou: boolean;
}

export interface Fase { ligada: boolean; semanas: number; meta: number }

/* diasDosTreinos: o dia corrido de cada treino que contou presença (concluído ou encerrado antes).
   Cancelar não conta, então quem chama nunca passa uma sessão cancelada. Dois treinos no mesmo dia contam os dois. */
export function presenca(diasDosTreinos: readonly number[], hoje: number, fase: Fase): Presenca {
  const total = diasDosTreinos.length;
  if (!total) return { semana: 1, feitosNaSemana: 0, meta: fase.meta, total, ajusteRestante: SEMANA_DE_AJUSTE, travado: false, faseTerminou: false };
  const primeiro = Math.min(...diasDosTreinos);
  const semanaDe = (d: number) => Math.floor((d - primeiro) / 7) + 1;
  const semana = semanaDe(hoje);
  const feitosNaSemana = diasDosTreinos.filter(d => semanaDe(d) === semana).length;
  const ajusteRestante = Math.max(0, SEMANA_DE_AJUSTE - (hoje - primeiro));
  const faseTerminou = fase.ligada && semana > fase.semanas;
  return { semana, feitosNaSemana, meta: fase.meta, total, ajusteRestante, travado: fase.ligada && ajusteRestante === 0 && !faseTerminou, faseTerminou };
}

/* Conquistas do MVP: só as quatro por número de treinos, iguais às da v1. */
export const CONQUISTAS = [
  { id: "primeira_missao", nome: "Primeira missão", treinos: 1 },
  { id: "habitue", nome: "Habitué", treinos: 5 },
  { id: "veterano", nome: "Veterano", treinos: 10 },
  { id: "doom_slayer", nome: "Doom slayer", treinos: 30 }
] as const;

export type Conquista = (typeof CONQUISTAS)[number];

export const conquistadas = (total: number): Conquista[] => CONQUISTAS.filter(c => total >= c.treinos);

/* A conquista que o treino de número `total` acabou de destravar, para o resumo da sessão. */
export const conquistaNova = (total: number): Conquista | undefined => CONQUISTAS.find(c => c.treinos === total);

/* O aviso da tela Hoje na volta depois de pausa, igual ao do mock. A carga em si vem do cartão (progressao.ts). */
export function avisoDeVolta(diasParado: number): string | null {
  if (diasParado >= 28) return "Um mês fora. O Doomguy também volta do inferno: depois de quatro semanas a força começa a cair, então a carga vem 10% mais leve.";
  if (diasParado >= 15) return `${diasParado} dias fora. Nada zerou: a força se mantém nesse intervalo, então a carga continua a mesma e hoje a meta é o começo da faixa.`;
  return null;
}

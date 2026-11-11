// Tipos das regras de treino. Sem React e sem banco: entram dados, saem decisões.

export type Equipamento = "barra" | "smith" | "carregada" | "pilha" | "halteres";

/* Faixa de repetições como par de números, nunca como texto "8-12" (como na v1). */
export type Faixa = readonly [number, number];

export type Serie =
  | { tipo: "NORMAL"; ger: number; faixa: Faixa }
  | { tipo: "REST_PAUSE" }
  | { tipo: "MUSCLE_ROUND" };

/* O que a pessoa fez em cada série. Normal: repetições e o GER registrado (sem registro, vale o alvo).
   Rest-pause: repetições dos dois blocos. Muscle round: blocos completos e as repetições do último bloco feito. */
export type Resultado =
  | { reps: number; ger?: number }
  | { b1: number; b2: number }
  | { blocos: number; ultimo: number };

/* A última vez do exercício com a mesma configuração de séries: a carga e um resultado por série. */
export interface Registro { kg: number; resultados: readonly Resultado[] }

export type EstadoDoMusculo = "estreante" | "pre_ativado" | "ja_primario";

/* Um exercício dentro do treino do dia, na ordem do protocolo. preparo: "auto" segue o estado do músculo; um número trava. */
export interface ExercicioDoTreino {
  musculo: string;
  acessorios: readonly string[];
  equipamento: Equipamento;
  series: readonly Serie[];
  preparo: "auto" | 0 | 1 | 2 | 3;
  descanso: number;
  descansoPreparo: number;
}

// Séries de preparo, passos da sessão, descanso entre passos e duração estimada do treino.
import type { EstadoDoMusculo, ExercicioDoTreino, Serie } from "./tipos.ts";
import { cap } from "./texto.ts";

/* Rampa do preparo por quantidade de séries: fração da carga de trabalho e faixa de repetições. */
export const RAMPAS: Readonly<Record<number, readonly (readonly [number, string])[]>> = {
  3: [[0.55, "8 a 10"], [0.70, "6 a 8"], [0.85, "4 a 6"]],
  2: [[0.60, "8 a 10"], [0.80, "4 a 6"]],
  1: [[0.80, "4 a 6"]],
  0: []
};

const AUTOMATICO: Readonly<Record<EstadoDoMusculo, number>> = { estreante: 3, pre_ativado: 2, ja_primario: 1 };

export interface Preparo { n: number; estado: EstadoDoMusculo; automatico: number; travado: boolean; porque: string }

/* O preparo segue o estado do músculo nos exercícios anteriores: ter sido principal vence ter sido acessório.
   O automático nunca dá zero; só a trava manual (0 a 3) chega a zero. */
export function preparo(lista: readonly ExercicioDoTreino[], k: number): Preparo {
  const ex = lista[k], m = ex.musculo, antes = lista.slice(0, k);
  const principal = antes.some(e => e.musculo === m);
  const acessorio = antes.some(e => e.acessorios.includes(m));
  const estado: EstadoDoMusculo = principal ? "ja_primario" : acessorio ? "pre_ativado" : "estreante";
  const automatico = AUTOMATICO[estado];
  const travado = ex.preparo !== "auto";
  const n = ex.preparo === "auto" ? automatico : ex.preparo;
  const estadoTxt = {
    estreante: `${cap(m)} entra pela primeira vez na sessão (estreante), então são 3 séries de preparo.`,
    pre_ativado: `${cap(m)} já trabalhou como acessório antes nesta sessão (pré-ativado), então são 2 séries de preparo.`,
    ja_primario: `${cap(m)} já foi o músculo principal de um exercício anterior (já primário), então é 1 série de preparo.`
  }[estado];
  const porque = travado ? `Travado manualmente em ${n}. Pelo estado do músculo seriam ${automatico}: ${estadoTxt.charAt(0).toLowerCase() + estadoTxt.slice(1)}` : estadoTxt;
  return { n, estado, automatico, travado, porque };
}

export type Passo =
  | { k: number; tipo: "CALIBRACAO" }
  | { k: number; tipo: "PREPARO"; j: number; n: number; fracao: number; faixa: string }
  | { k: number; tipo: "TRABALHO"; j: number; serie: Serie };

/* A sessão vira uma lista linear: calibração, preparos e séries válidas, exercício a exercício. */
export function passos(lista: readonly ExercicioDoTreino[]): Passo[] {
  const p: Passo[] = [];
  lista.forEach((ex, k) => {
    p.push({ k, tipo: "CALIBRACAO" });
    const { n } = preparo(lista, k);
    RAMPAS[n].forEach(([fracao, faixa], j) => p.push({ k, tipo: "PREPARO", j, n, fracao, faixa }));
    ex.series.forEach((serie, j) => p.push({ k, tipo: "TRABALHO", j, serie }));
  });
  return p;
}

/* Descanso só antes de preparo ou de série válida, nunca depois da calibração; o valor é o do exercício do próximo passo. */
export function descansoAntes(atual: Passo, proximo: Passo | undefined, lista: readonly ExercicioDoTreino[]): number {
  if (!proximo || atual.tipo === "CALIBRACAO") return 0;
  if (proximo.tipo === "PREPARO") return lista[proximo.k].descansoPreparo;
  if (proximo.tipo === "TRABALHO") return lista[proximo.k].descanso;
  return 0;
}

const EXECUCAO = { PREPARO: 20, NORMAL: 35, REST_PAUSE: 75, MUSCLE_ROUND: 120 } as const;

/* Duração estimada em minutos: 75 s de troca por exercício, a execução de cada passo e os descansos. */
export function estimativaMin(lista: readonly ExercicioDoTreino[]): number {
  const p = passos(lista);
  let s = lista.length * 75;
  p.forEach((x, i) => {
    if (x.tipo === "PREPARO") s += EXECUCAO.PREPARO;
    if (x.tipo === "TRABALHO") s += EXECUCAO[x.serie.tipo];
    s += descansoAntes(x, p.at(i + 1), lista);
  });
  return Math.round(s / 60);
}

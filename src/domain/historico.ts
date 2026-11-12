// Ligação do histórico: cada registro de série guarda a chave do exercício e a configuração das séries válidas.
// A "última vez" (base da progressão) é a última sessão com a mesma chave e a mesma configuração.
import type { Registro, Resultado, Serie } from "./tipos.ts";

/* Exercício da biblioteca: o id dela. Sem vínculo: o nome em maiúsculas. */
export const chaveDoExercicio = (bibliotecaId: string | null, nome?: string | null) =>
  bibliotecaId ?? `nome:${(nome ?? "").trim().toUpperCase()}`;

/* "N9:8-10|RP|MR": o tipo de cada série, e na normal o GER e a faixa. Mudar qualquer um vira outra configuração. */
export const configuracao = (series: readonly Serie[]) =>
  series.map(s => s.tipo === "NORMAL" ? `N${s.ger}:${s.faixa[0]}-${s.faixa[1]}` : s.tipo === "REST_PAUSE" ? "RP" : "MR").join("|");

export interface RegistroDaApi {
  passo: "calibracao" | "preparo" | "valida"; ordem: number; tipo: string | null; kg: number;
  reps: number | null; ger: number | null; b1: number | null; b2: number | null; blocos: number | null; ultimo: number | null;
}

/* As séries válidas da última sessão viram o Registro que a progressão usa: a carga e um resultado por série. */
export function registroDaApi(regs: readonly RegistroDaApi[], series: readonly Serie[]): Registro | null {
  const validas = regs.filter(r => r.passo === "valida");
  if (!validas.length) return null;
  const resultados: Resultado[] = series.map((s, j) => {
    const r = validas.find(x => x.ordem === j);
    if (!r) return s.tipo === "NORMAL" ? { reps: 0 } : s.tipo === "REST_PAUSE" ? { b1: 0, b2: 0 } : { blocos: 0, ultimo: 0 };
    if (s.tipo === "NORMAL") return r.ger != null ? { reps: r.reps ?? 0, ger: r.ger } : { reps: r.reps ?? 0 };
    if (s.tipo === "REST_PAUSE") return { b1: r.b1 ?? 0, b2: r.b2 ?? 0 };
    return { blocos: r.blocos ?? 0, ultimo: r.ultimo ?? 0 };
  });
  // A carga de trabalho é a da primeira série válida (a calibração vale para todas as séries do exercício).
  return { kg: validas.find(x => x.ordem === 0)?.kg ?? validas[0]!.kg, resultados };
}

// Formatação dos textos das regras, igual à do mock: vírgula decimal e listas com "e".
import type { Faixa } from "./tipos.ts";

export const fmt = (n: number) => (Math.round(n * 100) / 100).toString().replace(".", ",");
export const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
export const faixaTxt = (f: Faixa) => `${f[0]} a ${f[1]}`;
export const juntar = (a: readonly string[]) => a.length < 2 ? (a[0] ?? "") : a.slice(0, -1).join(", ") + " e " + a.at(-1);

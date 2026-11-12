// A última vez de cada exercício (base da sugestão de carga): da API, com cópia no aparelho para abrir sem internet.
// Vale a mais nova entre a da API e a do aparelho, porque o treino que acabou pode ainda estar na fila de envio.
import type { RegistroDaApi } from "../domain/historico.ts";
import { api } from "../lib/api.ts";
import { gravarChave, lerChave } from "../lib/idb.ts";

export type Ultimos = Record<string, { em: string; registros: RegistroDaApi[] } | null>;

const maisNova = (a: Ultimos[string] | undefined, b: Ultimos[string] | undefined) => !a ? b ?? null : !b ? a : (a.em >= b.em ? a : b);

export async function buscarUltimos(itens: { chave: string; configuracao: string }[]): Promise<Ultimos> {
  const salvo = (await lerChave<Ultimos>("ultimos").catch(() => undefined)) ?? {};
  let daApi: Ultimos = {};
  try {
    daApi = (await api<{ ultimos: Ultimos }>("POST", "/historico/ultimos", { itens })).ultimos;
  } catch { /* sem rede: fica o que está no aparelho */ }
  const junto: Ultimos = { ...salvo };
  for (const i of itens) { const k = `${i.chave}|${i.configuracao}`; junto[k] = maisNova(salvo[k] ?? undefined, daApi[k] ?? undefined); }
  await gravarChave("ultimos", junto).catch(() => {});
  return junto;
}

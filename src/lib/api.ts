// Chamadas à API, na mesma origem (/api). O cookie de sessão vai sozinho.
import { SemSessao, type Envio } from "./fila.ts";

export class ErroDaApi extends Error {
  readonly status: number;
  readonly corpo: Record<string, unknown>;
  constructor(status: number, corpo: Record<string, unknown>) {
    super(typeof corpo.erro === "string" ? corpo.erro : `Erro ${status}`);
    this.status = status;
    this.corpo = corpo;
  }
}

export async function api<T>(metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", caminho: string, corpo?: unknown): Promise<T> {
  const r = await fetch(`/api${caminho}`, {
    method: metodo,
    credentials: "same-origin",
    headers: corpo === undefined ? {} : { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  if (r.status === 204) return undefined as T;
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroDaApi(r.status, dados);
  return dados as T;
}

export interface Conta { id: string; nome: string; email: string }

/* O envio da fila. Sem rede, fetch lança TypeError e a fila guarda para depois. */
export const enviarLote: Envio = async lote => {
  try {
    return await api("POST", "/envio", lote);
  } catch (e) {
    if (e instanceof ErroDaApi && e.status === 401) throw new SemSessao();
    if (e instanceof ErroDaApi && e.status < 500) throw new Error(e.message, { cause: e });
    throw new Error("Sem conexão. O treino está salvo no aparelho e vai assim que a rede voltar.", { cause: e });
  }
};

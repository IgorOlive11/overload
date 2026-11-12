// Acesso ao banco. Toda leitura ou gravação de dado de conta passa por naConta, que abre uma transação
// e grava a conta em overload.conta_id. A RLS do banco faz o resto: sem conta, nenhuma linha aparece.
import pg from "pg";

// numeric volta como texto no pg; a carga cabe em number sem perda.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, v => Number(v));
// date volta como texto "AAAA-MM-DD", sem passar por fuso.
pg.types.setTypeParser(pg.types.builtins.DATE, v => v);

export type Cliente = pg.PoolClient;

export function criarPool(url: string): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, application_name: "overload-api" });
}

export async function transacao<T>(pool: pg.Pool, conta: string | null, fn: (c: Cliente) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (conta) await c.query("select set_config('overload.conta_id', $1, true)", [conta]);
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// Apoio aos testes de banco: um banco novo por arquivo de teste, preparado e migrado como em produção.
// Precisa de DATABASE_URL_TESTE apontando para um superusuário de um Postgres descartável (o CI sobe um).
// Sem a variável, os testes de banco são pulados.
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { migrar } from "../../db/migrar.ts";
import { preparar } from "../../db/preparar.ts";

export const URL_TESTE = process.env.DATABASE_URL_TESTE;
export const semBanco = !URL_TESTE && "Defina DATABASE_URL_TESTE para rodar os testes de banco.";

export interface Banco {
  api: pg.Pool;
  urlApi: string;
  urlDono: string;
  fechar(): Promise<void>;
}

const comUsuario = (url: string, usuario: string, senha: string, banco: string) => {
  const u = new URL(url);
  u.username = usuario;
  u.password = senha;
  u.pathname = `/${banco}`;
  return u.toString();
};

export async function bancoDeTeste(): Promise<Banco> {
  if (!URL_TESTE) throw new Error("DATABASE_URL_TESTE não definida");
  const nome = `overload_teste_${randomBytes(6).toString("hex")}`;
  const raiz = new pg.Client({ connectionString: URL_TESTE });
  await raiz.connect();
  await raiz.query(`create database ${nome}`);
  await raiz.end();

  const urlAdmin = (() => { const u = new URL(URL_TESTE); u.pathname = `/${nome}`; return u.toString(); })();
  const admin = new pg.Client({ connectionString: urlAdmin });
  await admin.connect();
  const senhas = { dono: randomBytes(24).toString("hex"), api: randomBytes(24).toString("hex") };
  await preparar(admin, senhas);
  await admin.end();

  const urlDono = comUsuario(URL_TESTE, "overload_dono", senhas.dono, nome);
  const urlApi = comUsuario(URL_TESTE, "overload_api", senhas.api, nome);
  const dono = new pg.Client({ connectionString: urlDono });
  await dono.connect();
  await migrar(dono);
  await dono.end();

  const api = new pg.Pool({ connectionString: urlApi, max: 4 });
  return {
    api, urlApi, urlDono,
    async fechar() {
      await api.end();
      const r = new pg.Client({ connectionString: URL_TESTE });
      await r.connect();
      await r.query(`drop database if exists ${nome} with (force)`);
      await r.end();
    }
  };
}

/* Roda fn numa transação com a conta gravada, como a API faz em cada requisição. conta null: sem conta. */
export async function comoConta<T>(pool: pg.Pool, conta: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (conta) await c.query("select set_config('overload.conta_id', $1, true)", [conta]);
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

const HASH = bcrypt.hashSync("senha de teste", 4);

/* Cria uma conta pelo mesmo caminho do cadastro e devolve o id. */
export async function novaConta(pool: pg.Pool, nome = "Teste"): Promise<string> {
  const email = `${randomUUID()}@exemplo.test`;
  const { rows } = await pool.query<{ id: string }>(
    "select overload.criar_conta($1, $2, $3, $4, $5) as id",
    [email, nome, HASH, randomBytes(32), "https://exemplo.test/confirmar"]
  );
  return rows[0]!.id;
}

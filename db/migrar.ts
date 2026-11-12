// Aplica as migrações de db/migrations em ordem, uma transação por arquivo, como overload_dono.
// Uso: DATABASE_URL_MIGRACAO=postgres://overload_dono:...@host/db node db/migrar.ts
// Migração aplicada nunca é editada: o executor guarda o hash e recusa um arquivo que mudou.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export interface Migracao { nome: string; sql: string; hash: string }

export function lerMigracoes(pasta = PASTA): Migracao[] {
  return readdirSync(pasta)
    .filter(f => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map(nome => {
      const sql = readFileSync(path.join(pasta, nome), "utf8");
      return { nome, sql, hash: createHash("sha256").update(sql).digest("hex") };
    });
}

/* Devolve os nomes das migrações aplicadas agora. */
export async function migrar(cliente: pg.ClientBase, migracoes = lerMigracoes()): Promise<string[]> {
  await cliente.query(`create table if not exists overload.migracoes (
    nome text primary key, hash text not null, aplicada_em timestamptz not null default now())`);
  const { rows } = await cliente.query<{ nome: string; hash: string }>("select nome, hash from overload.migracoes");
  const feitas = new Map(rows.map(r => [r.nome, r.hash]));
  const aplicadas: string[] = [];
  for (const m of migracoes) {
    const hash = feitas.get(m.nome);
    if (hash !== undefined) {
      if (hash !== m.hash) throw new Error(`A migração ${m.nome} mudou depois de aplicada. Crie uma migração nova.`);
      continue;
    }
    await cliente.query("begin");
    try {
      await cliente.query(m.sql);
      await cliente.query("insert into overload.migracoes (nome, hash) values ($1, $2)", [m.nome, m.hash]);
      await cliente.query("commit");
      aplicadas.push(m.nome);
    } catch (e) {
      await cliente.query("rollback");
      throw new Error(`Falhou em ${m.nome}: ${(e as Error).message}`, { cause: e });
    }
  }
  return aplicadas;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL_MIGRACAO;
  if (!url) { console.error("Defina DATABASE_URL_MIGRACAO (usuário overload_dono)."); process.exit(1); }
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    const feitas = await migrar(cliente);
    console.log(feitas.length ? `Aplicadas: ${feitas.join(", ")}` : "Nada a aplicar.");
  } finally {
    await cliente.end();
  }
}

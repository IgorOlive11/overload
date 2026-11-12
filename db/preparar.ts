// Preparo do banco, uma vez, por um superusuário: cria overload_dono, overload_api e o schema, e define as senhas.
// Uso: DATABASE_URL_ADMIN=... SENHA_OVERLOAD_DONO=... SENHA_OVERLOAD_API=... node db/preparar.ts
// As senhas vêm só do ambiente; nada é gravado no repositório nem no log.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const PAPEIS = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "papeis.sql"), "utf8");

export async function preparar(admin: pg.ClientBase, senhas: { dono: string; api: string }): Promise<void> {
  for (const s of [senhas.dono, senhas.api]) if (s.length < 24) throw new Error("Use senhas com pelo menos 24 caracteres.");
  await admin.query(PAPEIS);
  await admin.query(`alter role overload_dono password ${admin.escapeLiteral(senhas.dono)}`);
  await admin.query(`alter role overload_api password ${admin.escapeLiteral(senhas.api)}`);
  const { rows } = await admin.query<{ db: string }>("select current_database() as db");
  await admin.query(`grant connect on database ${admin.escapeIdentifier(rows[0]!.db)} to overload_dono, overload_api`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { DATABASE_URL_ADMIN: url, SENHA_OVERLOAD_DONO: dono, SENHA_OVERLOAD_API: api } = process.env;
  if (!url || !dono || !api) { console.error("Defina DATABASE_URL_ADMIN, SENHA_OVERLOAD_DONO e SENHA_OVERLOAD_API."); process.exit(1); }
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  try { await preparar(admin, { dono, api }); console.log("Banco preparado."); } finally { await admin.end(); }
}

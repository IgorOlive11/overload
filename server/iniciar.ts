// Ponto de entrada do container: prepara o banco (só se DATABASE_URL_ADMIN estiver definida, no primeiro deploy),
// aplica as migrações como overload_dono e sobe a API com o app.
import pg from "pg";
import { migrar } from "../db/migrar.ts";
import { preparar } from "../db/preparar.ts";

const env = process.env;

if (env.DATABASE_URL_ADMIN) {
  if (!env.SENHA_OVERLOAD_DONO || !env.SENHA_OVERLOAD_API) throw new Error("Com DATABASE_URL_ADMIN, defina SENHA_OVERLOAD_DONO e SENHA_OVERLOAD_API.");
  const admin = new pg.Client({ connectionString: env.DATABASE_URL_ADMIN });
  await admin.connect();
  try { await preparar(admin, { dono: env.SENHA_OVERLOAD_DONO, api: env.SENHA_OVERLOAD_API }); } finally { await admin.end(); }
  console.log("Banco preparado. Tire DATABASE_URL_ADMIN do ambiente depois do primeiro deploy.");
}

if (env.DATABASE_URL_MIGRACAO) {
  const dono = new pg.Client({ connectionString: env.DATABASE_URL_MIGRACAO });
  await dono.connect();
  try {
    const feitas = await migrar(dono);
    console.log(feitas.length ? `Migrações aplicadas: ${feitas.join(", ")}` : "Banco em dia.");
  } finally { await dono.end(); }
}

await import("./index.ts");

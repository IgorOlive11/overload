// Sobe a API: lê a configuração, abre o banco, liga a fila de e-mail e escuta a porta.
import { construirApp } from "./app.ts";
import { criarPool } from "./banco.ts";
import { lerConfig } from "./config.ts";
import { iniciarCarteiro } from "./email.ts";

const cfg = lerConfig();
const pool = criarPool(cfg.urlBanco);
// A rota de cadastro avisa a fila de e-mail; a fila usa o log do app. Um segura a referência do outro.
const ref: { carteiro?: ReturnType<typeof iniciarCarteiro> } = {};
const app = await construirApp(pool, cfg, () => ref.carteiro?.avisar());
ref.carteiro = iniciarCarteiro(pool, cfg, { info: (o, m) => app.log.info(o, m), error: (o, m) => app.log.error(o, m) });

await app.listen({ port: cfg.porta, host: "0.0.0.0" });
console.log(`API do Overload na porta ${cfg.porta}`);

for (const sinal of ["SIGTERM", "SIGINT"] as const) {
  process.once(sinal, async () => {
    await app.close();
    await ref.carteiro?.parar();
    await pool.end();
    process.exit(0);
  });
}

// Monta a API. Separado do index.ts para os testes chamarem com app.inject, sem abrir porta.
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type pg from "pg";
import { rotasDaBiblioteca } from "./biblioteca.ts";
import type { Config } from "./config.ts";
import { lerSessao, rotasDeConta } from "./conta.ts";
import { servirApp } from "./estatico.ts";
import { rotasDeProtocolo } from "./protocolo.ts";
import { rotasDeTreino } from "./treino.ts";

export async function construirApp(pool: pg.Pool, cfg: Config, avisarEmail: () => void = () => {}): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: cfg.confiarProxy,
    bodyLimit: 512 * 1024,
    logger: cfg.producao
      ? { level: "info", redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'] }
      : false,
    // Sem remover nem converter campos: entrada fora do esquema é recusada, não consertada.
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, allErrors: false } }
  });

  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  // Requisição que muda algo só vale vinda do próprio app (o cookie é SameSite=Lax; isto fecha o resto).
  app.addHook("onRequest", async (req, reply) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
    const origem = req.headers.origin;
    if (origem && origem !== cfg.origem) return reply.code(403).send({ erro: "Origem não permitida." });
  });

  app.setErrorHandler((erro: { statusCode?: number; validation?: unknown; message: string }, req, reply) => {
    if (erro.validation) return reply.code(400).send({ erro: "Dados inválidos.", detalhe: erro.message });
    if (erro.statusCode && erro.statusCode < 500) return reply.code(erro.statusCode).send({ erro: erro.message });
    req.log.error(erro);
    return reply.code(500).send({ erro: "Erro no servidor. Tente de novo." });
  });

  await app.register(async api => {
    lerSessao(api, pool);
    api.get("/saude", async () => {
      await pool.query("select 1");
      return { ok: true };
    });
    rotasDeConta(api, pool, cfg, avisarEmail);
    rotasDeProtocolo(api, pool);
    rotasDeTreino(api, pool);
    rotasDaBiblioteca(api, pool);
  }, { prefix: "/api" });

  if (cfg.pastaApp && !(await servirApp(app, cfg.pastaApp))) throw new Error(`PASTA_APP sem index.html: ${cfg.pastaApp}`);

  return app;
}

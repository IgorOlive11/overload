// Serve o PWA construído (dist/) na mesma origem da API. Rotas do app que não são arquivo voltam o index.html.
// O index.html e o service worker nunca ficam em cache no navegador, para a atualização automática chegar;
// os arquivos com hash no nome (assets/) ficam em cache para sempre.
import { existsSync } from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

const SEM_CACHE = /(^|\/)(index\.html|sw\.js|registerSW\.js|manifest\.webmanifest)$/;

export async function servirApp(app: FastifyInstance, pasta: string): Promise<boolean> {
  const raiz = path.resolve(pasta);
  if (!existsSync(path.join(raiz, "index.html"))) return false;
  await app.register(fastifyStatic, {
    root: raiz,
    wildcard: false,
    index: false,
    cacheControl: false,
    setHeaders(res, caminho) {
      const rel = path.relative(raiz, caminho).split(path.sep).join("/");
      if (SEM_CACHE.test(rel)) res.header("cache-control", "no-cache");
      else if (rel.startsWith("assets/")) res.header("cache-control", "public, max-age=31536000, immutable");
      else res.header("cache-control", "public, max-age=86400");
    }
  });
  app.addHook("onSend", async (req, reply, corpo) => {
    if (!req.url.startsWith("/api/")) {
      reply.header("x-content-type-options", "nosniff");
      reply.header("referrer-policy", "same-origin");
      reply.header("x-frame-options", "DENY");
    }
    return corpo;
  });
  app.setNotFoundHandler((req, reply) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.url.startsWith("/api/") || path.extname(req.url.split("?")[0]!)) {
      return reply.code(404).send({ erro: "Não encontrado." });
    }
    return reply.header("cache-control", "no-cache").sendFile("index.html");
  });
  return true;
}

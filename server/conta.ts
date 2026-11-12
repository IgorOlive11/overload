// Conta e sessão: cadastro, confirmação por e-mail, login, saída e redefinição de senha.
// A senha é guardada com bcrypt (os hashes $2a$ do v1 entram sem mudança). A sessão é um cookie HttpOnly
// com um token aleatório; o banco guarda só o SHA-256 dele.
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type pg from "pg";
import { transacao } from "./banco.ts";
import type { Config } from "./config.ts";

export const COOKIE = "overload_sessao";
const VALIDADE_S = 60 * 24 * 60 * 60;
const CUSTO = 12;
// Comparado quando o e-mail não existe, para o tempo da resposta não dizer se a conta existe.
const HASH_FALSO = bcrypt.hashSync(randomBytes(16).toString("hex"), CUSTO);

declare module "fastify" {
  interface FastifyRequest { contaId: string | null }
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest();
const novoToken = () => randomBytes(32).toString("base64url");

const email = { type: "string", minLength: 3, maxLength: 254 } as const;
// bcrypt só usa os primeiros 72 bytes; acima disso a senha seria cortada sem aviso.
const senha = { type: "string", minLength: 8, maxLength: 72 } as const;
const token = { type: "string", minLength: 20, maxLength: 100 } as const;
const nome = { type: "string", minLength: 1, maxLength: 60 } as const;

const corpo = (props: Record<string, object>, required = Object.keys(props)) =>
  ({ body: { type: "object", additionalProperties: false, required, properties: props } });

export function rotasDeConta(app: FastifyInstance, pool: pg.Pool, cfg: Config, avisarEmail: () => void) {
  // 10 tentativas a cada 15 minutos por IP e e-mail (o limite geral de 300 por minuto por IP vale por cima).
  const limite = { rateLimit: {
    max: 10, timeWindow: "15 minutes", hook: "preHandler" as const,
    keyGenerator: (req: FastifyRequest) => {
      const b = req.body as { email?: unknown; token?: unknown } | undefined;
      return `${req.ip}|${String(b?.email ?? b?.token ?? "").toLowerCase().trim().slice(0, 254)}`;
    }
  } };

  const abrirSessao = async (reply: FastifyReply, contaId: string, req: FastifyRequest) => {
    const t = novoToken();
    await transacao(pool, contaId, c => c.query(
      "insert into overload.sessoes_login (token_hash, aparelho) values ($1, $2)",
      [hashToken(t), (req.headers["user-agent"] ?? "").slice(0, 200)]));
    reply.setCookie(COOKIE, t, { path: "/", httpOnly: true, secure: cfg.producao, sameSite: "lax", maxAge: VALIDADE_S });
  };

  const dadosDaConta = (contaId: string) => transacao(pool, contaId, async c =>
    (await c.query("select id, nome, email from overload.contas where id = $1", [contaId])).rows[0] ?? null);

  app.post("/conta", { config: limite, schema: corpo({ nome, email, senha }) }, async (req, reply) => {
    const b = req.body as { nome: string; email: string; senha: string };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email.trim())) return reply.code(400).send({ erro: "E-mail inválido." });
    if (!b.nome.trim()) return reply.code(400).send({ erro: "Diga como quer ser chamado." });
    const t = novoToken();
    await pool.query("select overload.criar_conta($1, $2, $3, $4, $5)",
      [b.email, b.nome, await bcrypt.hash(b.senha, CUSTO), hashToken(t), `${cfg.origem}/confirmar#t=${t}`]);
    avisarEmail();
    // A mesma resposta com e sem conta existente: o cadastro não revela quem usa o app.
    return reply.code(202).send({ ok: true });
  });

  app.post("/conta/reenviar", { config: limite, schema: corpo({ email }) }, async (req, reply) => {
    const t = novoToken();
    await pool.query("select overload.reenviar_confirmacao($1, $2, $3)",
      [(req.body as { email: string }).email, hashToken(t), `${cfg.origem}/confirmar#t=${t}`]);
    avisarEmail();
    return reply.code(202).send({ ok: true });
  });

  app.post("/conta/confirmar", { config: limite, schema: corpo({ token }) }, async (req, reply) => {
    const { rows } = await pool.query<{ id: string | null }>("select overload.confirmar_email($1) as id", [hashToken((req.body as { token: string }).token)]);
    const id = rows[0]?.id;
    if (!id) return reply.code(400).send({ erro: "Link inválido ou vencido. Peça outro." });
    await abrirSessao(reply, id, req);
    return { conta: await dadosDaConta(id) };
  });

  app.post("/sessao", { config: limite, schema: corpo({ email, senha }) }, async (req, reply) => {
    const b = req.body as { email: string; senha: string };
    const { rows } = await pool.query<{ id: string; senha_hash: string; confirmada: boolean }>(
      "select * from overload.conta_para_login($1)", [b.email]);
    const conta = rows[0];
    const certa = await bcrypt.compare(b.senha, conta?.senha_hash ?? HASH_FALSO);
    if (!conta || !certa) return reply.code(401).send({ erro: "E-mail ou senha errados." });
    if (!conta.confirmada) return reply.code(403).send({ erro: "Confirme o e-mail antes de entrar.", codigo: "email_nao_confirmado" });
    await abrirSessao(reply, conta.id, req);
    return { conta: await dadosDaConta(conta.id) };
  });

  app.delete("/sessao", async (req, reply) => {
    const t = req.cookies[COOKIE];
    if (t && req.contaId) {
      await transacao(pool, req.contaId, c => c.query("delete from overload.sessoes_login where token_hash = $1", [hashToken(t)]));
    }
    reply.clearCookie(COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.post("/conta/esqueci", { config: limite, schema: corpo({ email }) }, async (req, reply) => {
    const t = novoToken();
    await pool.query("select overload.pedir_redefinicao($1, $2, $3)",
      [(req.body as { email: string }).email, hashToken(t), `${cfg.origem}/redefinir#t=${t}`]);
    avisarEmail();
    return reply.code(202).send({ ok: true });
  });

  app.post("/conta/redefinir", { config: limite, schema: corpo({ token, senha }) }, async (req, reply) => {
    const b = req.body as { token: string; senha: string };
    const { rows } = await pool.query<{ id: string | null }>("select overload.redefinir_senha($1, $2) as id",
      [hashToken(b.token), await bcrypt.hash(b.senha, CUSTO)]);
    const id = rows[0]?.id;
    if (!id) return reply.code(400).send({ erro: "Link inválido ou vencido. Peça outro." });
    await abrirSessao(reply, id, req);
    return { conta: await dadosDaConta(id) };
  });

  app.get("/conta", { preHandler: exigirConta }, async req => ({ conta: await dadosDaConta(req.contaId!) }));

  app.patch("/conta", { preHandler: exigirConta, schema: corpo({ nome }) }, async (req, reply) => {
    const n = (req.body as { nome: string }).nome.trim();
    if (!n) return reply.code(400).send({ erro: "Diga como quer ser chamado." });
    await transacao(pool, req.contaId, c => c.query("update overload.contas set nome = $1 where id = $2", [n, req.contaId]));
    return { conta: await dadosDaConta(req.contaId!) };
  });
}

/* Lê o cookie em toda requisição. Rotas que precisam de conta usam exigirConta. */
export function lerSessao(app: FastifyInstance, pool: pg.Pool) {
  app.decorateRequest("contaId", null);
  app.addHook("onRequest", async req => {
    const t = req.cookies[COOKIE];
    if (!t || t.length > 100) return;
    const { rows } = await pool.query<{ id: string | null }>("select overload.conta_da_sessao($1) as id", [hashToken(t)]);
    req.contaId = rows[0]?.id ?? null;
  });
}

export async function exigirConta(req: FastifyRequest, reply: FastifyReply) {
  if (!req.contaId) return reply.code(401).send({ erro: "Entre na sua conta." });
}

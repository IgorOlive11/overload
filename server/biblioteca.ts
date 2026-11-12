// Biblioteca de exercícios: só leitura. A busca procura no nome e no apelido em português, 30 por página.
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { transacao } from "./banco.ts";
import { exigirConta } from "./conta.ts";

const CAMPOS = `id, nome, nome_pt as "nomePt", gif_url as "gifUrl", musculo, acessorios, equipamento, pilha_kg as "pilhaKg",
  partes, instrucoes, instrucoes_pt as "instrucoesPt"`;

export function rotasDaBiblioteca(app: FastifyInstance, pool: pg.Pool) {
  app.get("/biblioteca", {
    preHandler: exigirConta,
    schema: { querystring: { type: "object", additionalProperties: false, properties: {
      q: { type: "string", maxLength: 60 }, pagina: { type: "integer", minimum: 0, maximum: 1000, default: 0 } } } }
  }, async req => {
    const { q = "", pagina = 0 } = req.query as { q?: string; pagina?: number };
    const termo = `%${q.trim().replace(/[\\%_]/g, m => `\\${m}`)}%`;
    return { itens: await transacao(pool, req.contaId, async c => (await c.query(
      `select ${CAMPOS} from overload.biblioteca where nome ilike $1 or nome_pt ilike $1 or musculo ilike $1
        order by coalesce(nome_pt, nome) limit 30 offset $2`, [termo, pagina * 30])).rows) };
  });

  app.get("/biblioteca/:id", { preHandler: exigirConta }, async (req, reply) => {
    const item = await transacao(pool, req.contaId, async c =>
      (await c.query(`select ${CAMPOS} from overload.biblioteca where id = $1`, [(req.params as { id: string }).id])).rows[0]);
    return item ? { item } : reply.code(404).send({ erro: "Exercício não encontrado." });
  });
}

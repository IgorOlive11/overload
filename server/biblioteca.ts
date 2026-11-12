// Biblioteca de exercícios: só leitura. A busca procura no nome e no apelido em português, 30 por página.
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { transacao } from "./banco.ts";
import { exigirConta } from "./conta.ts";
import { CAMPOS_DA_BIBLIOTECA as CAMPOS } from "./protocolo.ts";

export function rotasDaBiblioteca(app: FastifyInstance, pool: pg.Pool) {
  app.get("/biblioteca", {
    preHandler: exigirConta,
    schema: { querystring: { type: "object", additionalProperties: false, properties: {
      q: { type: "string", maxLength: 60 }, musculos: { type: "string", maxLength: 200 },
      pagina: { type: "string", pattern: "^[0-9]{1,4}$" } } } }
  }, async req => {
    const { q = "", musculos = "", pagina = "0" } = req.query as { q?: string; musculos?: string; pagina?: string };
    // Busca sem acento, como no mock: "supino" acha "Supino", "triceps" acha "TRÍCEPS".
    const termo = `%${q.trim().replace(/[\\%_]/g, m => `\\${m}`)}%`;
    const grupo = musculos.split(",").map(m => m.trim()).filter(Boolean);
    return { itens: await transacao(pool, req.contaId, async c => (await c.query(
      `select ${CAMPOS} from overload.biblioteca
        where (overload.sem_acento(nome) ilike overload.sem_acento($1) or overload.sem_acento(coalesce(nome_pt, '')) ilike overload.sem_acento($1)
               or overload.sem_acento(musculo) ilike overload.sem_acento($1))
          and (cardinality($2::text[]) = 0 or musculo = any($2))
        order by coalesce(nome_pt, nome) limit 30 offset $3`, [termo, grupo, Number(pagina) * 30])).rows) };
  });

  app.get("/biblioteca/:id", { preHandler: exigirConta }, async (req, reply) => {
    const item = await transacao(pool, req.contaId, async c =>
      (await c.query(`select ${CAMPOS} from overload.biblioteca where id = $1`, [(req.params as { id: string }).id])).rows[0]);
    return item ? { item } : reply.code(404).send({ erro: "Exercício não encontrado." });
  });
}

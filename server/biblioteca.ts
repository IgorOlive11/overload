// Biblioteca de exercícios: só leitura. A busca procura no nome e no apelido em português, 30 por página.
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { transacao } from "./banco.ts";
import { exigirConta } from "./conta.ts";
import { CAMPOS_DA_BIBLIOTECA as CAMPOS } from "./protocolo.ts";
import { termosDeBusca } from "../src/domain/busca.ts";

export function rotasDaBiblioteca(app: FastifyInstance, pool: pg.Pool) {
  app.get("/biblioteca", {
    preHandler: exigirConta,
    schema: { querystring: { type: "object", additionalProperties: false, properties: {
      q: { type: "string", maxLength: 60 }, musculos: { type: "string", maxLength: 200 }, ids: { type: "string", maxLength: 4000 },
      pagina: { type: "string", pattern: "^[0-9]{1,4}$" } } } }
  }, async req => {
    const { q = "", musculos = "", pagina = "0", ids } = req.query as { q?: string; musculos?: string; pagina?: string; ids?: string };
    // Por ids: os itens de um modelo pronto ou de um CSV, de uma vez.
    if (ids !== undefined) return { itens: await transacao(pool, req.contaId, async c => (await c.query(
      `select ${CAMPOS} from overload.biblioteca where id = any($1)`, [ids.split(",").map(x => x.trim()).filter(Boolean).slice(0, 200)])).rows) };
    // Busca sem acento e com tradução de termos de academia (src/domain/busca.ts): "supino inclinado" acha "incline bench press".
    const palavras = termosDeBusca(q).map(alts => alts.map(t => `%${t.replace(/[\\%_]/g, m => `\\${m}`)}%`));
    const grupo = musculos.split(",").map(m => m.trim()).filter(Boolean);
    const params: unknown[] = [grupo, Number(pagina) * 30];
    const condicoes = palavras.map(alts => {
      params.push(alts);
      const n = `$${params.length}::text[]`;
      return `(overload.sem_acento(nome) ilike any(${n}) or overload.sem_acento(coalesce(nome_pt, '')) ilike any(${n}) or overload.sem_acento(musculo) ilike any(${n}))`;
    });
    return { itens: await transacao(pool, req.contaId, async c => (await c.query(
      `select ${CAMPOS} from overload.biblioteca
        where ${condicoes.length ? condicoes.join(" and ") : "true"}
          and (cardinality($1::text[]) = 0 or musculo = any($1))
        order by (nome_pt is null), coalesce(nome_pt, nome) limit 30 offset $2`, params)).rows) };
  });

  app.get("/biblioteca/:id", { preHandler: exigirConta }, async (req, reply) => {
    const item = await transacao(pool, req.contaId, async c =>
      (await c.query(`select ${CAMPOS} from overload.biblioteca where id = $1`, [(req.params as { id: string }).id])).rows[0]);
    return item ? { item } : reply.code(404).send({ erro: "Exercício não encontrado." });
  });
}

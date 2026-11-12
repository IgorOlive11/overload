// Sessões e registros de série, enviados em lote pela fila do aparelho. Reenviar o mesmo lote não duplica nada:
// os ids vêm do aparelho e a gravação é "inserir se não existir". Um item recusado não derruba os outros.
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { filaDepois } from "../src/domain/agenda.ts";
import { transacao, type Cliente } from "./banco.ts";
import { exigirConta } from "./conta.ts";

const uuid = { type: "string", format: "uuid" } as const;
const quando = { type: "string", format: "date-time" } as const;
const n = (max: number) => ({ type: ["integer", "null"], minimum: 0, maximum: max }) as const;

const sessao = {
  type: "object", additionalProperties: false,
  required: ["id", "dia", "indiceTreino", "diaLocal", "iniciadaEm", "estado"],
  properties: {
    id: uuid, protocoloId: { anyOf: [uuid, { type: "null" }] }, protocoloVersao: { type: ["integer", "null"], minimum: 1 },
    dia: { type: "integer", minimum: 0, maximum: 6 }, indiceTreino: { type: "integer", minimum: 0, maximum: 6 },
    diaLocal: { type: "string", format: "date" }, iniciadaEm: quando, terminadaEm: { anyOf: [quando, { type: "null" }] },
    estado: { enum: ["em_andamento", "concluida", "encerrada", "cancelada"] }
  }
} as const;

const registro = {
  type: "object", additionalProperties: false,
  required: ["id", "sessaoId", "exercicioChave", "configuracao", "passo", "ordem", "kg", "feitoEm"],
  properties: {
    id: uuid, sessaoId: uuid, exercicioChave: { type: "string", minLength: 1, maxLength: 90 },
    exercicioId: { anyOf: [uuid, { type: "null" }] }, configuracao: { type: "string", minLength: 1, maxLength: 200 },
    passo: { enum: ["calibracao", "preparo", "valida"] }, ordem: { type: "integer", minimum: 0, maximum: 20 },
    tipo: { enum: ["NORMAL", "REST_PAUSE", "MUSCLE_ROUND", null] },
    kg: { type: "number", minimum: 0, maximum: 1000 },
    reps: n(200), ger: { type: ["integer", "null"], minimum: 7, maximum: 13 },
    b1: n(200), b2: n(200), blocos: n(6), ultimo: n(200),
    substitui: { anyOf: [uuid, { type: "null" }] }, feitoEm: quando
  }
} as const;

interface Sessao {
  id: string; protocoloId?: string | null; protocoloVersao?: number | null; dia: number; indiceTreino: number;
  diaLocal: string; iniciadaEm: string; terminadaEm?: string | null; estado: "em_andamento" | "concluida" | "encerrada" | "cancelada";
}
interface Registro {
  id: string; sessaoId: string; exercicioChave: string; exercicioId?: string | null; configuracao: string;
  passo: string; ordem: number; tipo?: string | null; kg: number; reps?: number | null; ger?: number | null;
  b1?: number | null; b2?: number | null; blocos?: number | null; ultimo?: number | null; substitui?: string | null; feitoEm: string;
}
interface Recusa { id: string; motivo: string }

/* Grava a sessão. Ao terminar com presença (concluída ou encerrada), a fila da agenda por sequência anda. */
async function gravarSessao(c: Cliente, s: Sessao): Promise<void> {
  await c.query(`insert into overload.sessoes_treino (id, protocolo_id, protocolo_versao, dia, indice_treino, dia_local, iniciada_em)
                 values ($1, $2, $3, $4, $5, $6, $7) on conflict (id) do nothing`,
    [s.id, s.protocoloId ?? null, s.protocoloVersao ?? null, s.dia, s.indiceTreino, s.diaLocal, s.iniciadaEm]);
  if (s.estado === "em_andamento") return;
  const { rows } = await c.query(
    `update overload.sessoes_treino set estado = $2, terminada_em = $3 where id = $1 and estado = 'em_andamento' returning protocolo_id`,
    [s.id, s.estado, s.terminadaEm ?? new Date().toISOString()]);
  // Já tinha terminado: reenvio da fila. Nada muda.
  if (!rows.length || s.estado === "cancelada" || !rows[0].protocolo_id) return;
  const p = (await c.query(
    `select p.agenda, p.fila, (select count(*)::int from overload.protocolo_dias d
       where d.protocolo_id = p.id and not d.folga and exists (select 1 from overload.protocolo_exercicios e where e.protocolo_id = p.id and e.dia = d.dia)) as total
     from overload.protocolos p where p.id = $1 for update`, [rows[0].protocolo_id])).rows[0];
  if (!p) return;
  const fila = filaDepois(p.agenda, s.indiceTreino, p.total, p.fila);
  if (fila !== p.fila) await c.query("update overload.protocolos set fila = $2 where id = $1", [rows[0].protocolo_id, fila]);
}

async function gravarRegistro(c: Cliente, r: Registro): Promise<void> {
  await c.query(`insert into overload.registros_serie (id, sessao_id, exercicio_chave, exercicio_id, configuracao, passo, ordem, tipo,
                 kg, reps, ger, b1, b2, blocos, ultimo, substitui, feito_em)
                 values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) on conflict (id) do nothing`,
    [r.id, r.sessaoId, r.exercicioChave, r.exercicioId ?? null, r.configuracao, r.passo, r.ordem, r.tipo ?? null, r.kg,
     r.reps ?? null, r.ger ?? null, r.b1 ?? null, r.b2 ?? null, r.blocos ?? null, r.ultimo ?? null, r.substitui ?? null, r.feitoEm]);
}

/* Cada item num savepoint: o que o banco recusar volta na lista de recusas, e o resto do lote fica gravado. */
async function cadaUm<T extends { id: string }>(c: Cliente, itens: readonly T[], fn: (c: Cliente, i: T) => Promise<void>, recusas: Recusa[]) {
  for (const i of itens) {
    await c.query("savepoint item");
    try {
      await fn(c, i);
      await c.query("release savepoint item");
    } catch (e) {
      await c.query("rollback to savepoint item");
      const codigo = (e as { code?: string }).code;
      if (!codigo?.startsWith("23") && codigo !== "42501") throw e;
      recusas.push({ id: i.id, motivo: (e as Error).message });
    }
  }
}

export function rotasDeTreino(app: FastifyInstance, pool: pg.Pool) {
  app.post("/envio", {
    preHandler: exigirConta,
    schema: { body: { type: "object", additionalProperties: false, properties: {
      sessoes: { type: "array", maxItems: 50, items: sessao }, registros: { type: "array", maxItems: 500, items: registro } } } }
  }, async req => {
    const b = req.body as { sessoes?: Sessao[]; registros?: Registro[] };
    const recusas: Recusa[] = [];
    await transacao(pool, req.contaId, async c => {
      // Sessões primeiro: os registros apontam para elas. Sessão que termina no mesmo lote só termina depois dos registros.
      const sessoes = b.sessoes ?? [];
      await cadaUm(c, sessoes, (c, s) => gravarSessao(c, { ...s, estado: "em_andamento" }), recusas);
      await cadaUm(c, b.registros ?? [], gravarRegistro, recusas);
      await cadaUm(c, sessoes.filter(s => s.estado !== "em_andamento"), gravarSessao, recusas);
    });
    return { recusas };
  });

  // Sessões que contam presença (concluída ou encerrada), para a tela Hoje e o Progresso.
  app.get("/sessoes", { preHandler: exigirConta }, async req => ({
    sessoes: await transacao(pool, req.contaId, async c => (await c.query(
      `select id, dia, indice_treino as "indiceTreino", dia_local as "diaLocal", iniciada_em as "iniciadaEm",
              terminada_em as "terminadaEm", estado, protocolo_id as "protocoloId"
       from overload.sessoes_treino where estado in ('concluida', 'encerrada') order by iniciada_em`)).rows)
  }));

  // A última vez do exercício com a mesma configuração de séries: a base da progressão (src/domain/progressao.ts).
  app.get("/historico/ultimo", {
    preHandler: exigirConta,
    schema: { querystring: { type: "object", additionalProperties: false, required: ["chave", "configuracao"], properties: {
      chave: { type: "string", minLength: 1, maxLength: 90 }, configuracao: { type: "string", minLength: 1, maxLength: 200 } } } }
  }, async req => {
    const q = req.query as { chave: string; configuracao: string };
    return { ultimo: await transacao(pool, req.contaId, c => ultimaVez(c, q.chave, q.configuracao)) };
  });
  async function ultimaVez(c: Cliente, chave: string, configuracao: string) {
      const s = (await c.query(
        `select s.id, s.iniciada_em from overload.sessoes_treino s
          where s.estado in ('concluida', 'encerrada')
            and exists (select 1 from overload.registros_serie r where r.sessao_id = s.id and r.exercicio_chave = $1 and r.configuracao = $2 and r.passo = 'valida')
          order by s.iniciada_em desc limit 1`, [chave, configuracao])).rows[0];
      if (!s) return null;
      const regs = (await c.query(
        `select r.passo, r.ordem, r.tipo, r.kg, r.reps, r.ger, r.b1, r.b2, r.blocos, r.ultimo from overload.registros_serie r
          where r.sessao_id = $1 and r.exercicio_chave = $2 and r.configuracao = $3
            and not exists (select 1 from overload.registros_serie x where x.substitui = r.id)
          order by r.passo, r.ordem, r.feito_em`, [s.id, chave, configuracao])).rows;
      return { sessaoId: s.id as string, em: s.iniciada_em as string, registros: regs };
  }

  // A última vez de vários exercícios de uma vez, para a tela Hoje e o começo do treino.
  app.post("/historico/ultimos", {
    preHandler: exigirConta,
    schema: { body: { type: "object", additionalProperties: false, required: ["itens"], properties: { itens: {
      type: "array", maxItems: 40, items: { type: "object", additionalProperties: false, required: ["chave", "configuracao"], properties: {
        chave: { type: "string", minLength: 1, maxLength: 90 }, configuracao: { type: "string", minLength: 1, maxLength: 200 } } } } } } }
  }, async req => {
    const { itens } = req.body as { itens: { chave: string; configuracao: string }[] };
    const ultimos: Record<string, { sessaoId: string; em: string; registros: object[] } | null> = {};
    await transacao(pool, req.contaId, async c => {
      for (const q of itens) ultimos[`${q.chave}|${q.configuracao}`] = await ultimaVez(c, q.chave, q.configuracao);
    });
    return { ultimos };
  });

  // Carga por exercício ao longo das sessões, para o Progresso: a maior carga válida de cada sessão.
  app.get("/historico/cargas", {
    preHandler: exigirConta,
    schema: { querystring: { type: "object", additionalProperties: false, required: ["chave"], properties: {
      chave: { type: "string", minLength: 1, maxLength: 90 } } } }
  }, async req => ({
    cargas: await transacao(pool, req.contaId, async c => (await c.query(
      `select s.dia_local as "diaLocal", max(r.kg) as kg from overload.registros_serie r
         join overload.sessoes_treino s on s.id = r.sessao_id
        where r.exercicio_chave = $1 and r.passo = 'valida' and s.estado in ('concluida', 'encerrada')
          and not exists (select 1 from overload.registros_serie x where x.substitui = r.id)
        group by s.id, s.dia_local order by s.dia_local`, [(req.query as { chave: string }).chave])).rows)
  }));

  // Carga de cada sessão por exercício e configuração, para o Progresso: a linha das últimas sessões e quantas vezes a carga subiu.
  app.get("/progresso", { preHandler: exigirConta }, async req => ({
    cargas: await transacao(pool, req.contaId, async c => (await c.query(
      `select r.exercicio_chave as chave, r.configuracao, s.dia_local as "diaLocal", max(r.kg) as kg
         from overload.registros_serie r
         join overload.sessoes_treino s on s.id = r.sessao_id
        where r.passo = 'valida' and s.estado in ('concluida', 'encerrada')
          and not exists (select 1 from overload.registros_serie x where x.substitui = r.id)
        group by r.exercicio_chave, r.configuracao, s.id, s.dia_local, s.iniciada_em
        order by s.iniciada_em`)).rows)
  }));
}

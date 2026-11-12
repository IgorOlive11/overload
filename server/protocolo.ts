// Protocolo da conta: uma semana-tipo, lida e gravada inteira. A gravação leva a versão em que a edição começou;
// se o protocolo mudou no meio do caminho (outro aparelho), a resposta é 409 com a versão atual, e o app mostra as duas.
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { transacao, type Cliente } from "./banco.ts";
import { exigirConta } from "./conta.ts";
import { MUSCULOS, type Serie } from "../src/domain/tipos.ts";

const EQUIPAMENTOS = ["barra", "smith", "carregada", "pilha", "halteres"];
const musculo = { type: "string", enum: [...MUSCULOS] } as const;

const serie = {
  oneOf: [
    { type: "object", additionalProperties: false, required: ["tipo", "ger", "faixa"], properties: {
      tipo: { const: "NORMAL" }, ger: { type: "integer", minimum: 7, maximum: 13 },
      faixa: { type: "array", minItems: 2, maxItems: 2, items: { type: "integer", minimum: 1, maximum: 50 } } } },
    { type: "object", additionalProperties: false, required: ["tipo"], properties: { tipo: { enum: ["REST_PAUSE", "MUSCLE_ROUND"] } } }
  ]
} as const;

const exercicio = {
  type: "object", additionalProperties: false, required: ["id", "series", "preparo"],
  properties: {
    id: { type: "string", format: "uuid" },
    bibliotecaId: { type: ["string", "null"], minLength: 1, maxLength: 64 },
    nome: { type: ["string", "null"], minLength: 1, maxLength: 80 },
    musculo: { anyOf: [musculo, { type: "null" }] },
    equipamento: { anyOf: [{ type: "string", enum: EQUIPAMENTOS }, { type: "null" }] },
    apelido: { type: ["string", "null"], maxLength: 80 },
    acessorios: { anyOf: [{ type: "array", maxItems: 10, uniqueItems: true, items: musculo }, { type: "null" }] },
    preparo: { anyOf: [{ const: "auto" }, { type: "integer", minimum: 0, maximum: 3 }] },
    descanso: { type: ["integer", "null"], minimum: 15, maximum: 600 },
    descansoPreparo: { type: ["integer", "null"], minimum: 10, maximum: 300 },
    // Exercício sem série fica para o rascunho do app; no protocolo salvo, pelo menos uma.
    series: { type: "array", minItems: 1, maxItems: 20, items: serie }
  }
} as const;

export const esquemaProtocolo = {
  type: "object", additionalProperties: false,
  required: ["versao", "agenda", "descanso", "descansoPreparo", "camada", "dias"],
  properties: {
    versao: { type: ["integer", "null"], minimum: 1 },
    agenda: { enum: ["semana", "sequencia"] },
    descanso: { type: "integer", minimum: 15, maximum: 600 },
    descansoPreparo: { type: "integer", minimum: 10, maximum: 300 },
    camada: { type: "object", additionalProperties: false, required: ["fase", "semanas", "meta", "metaN", "nuncaDuas"], properties: {
      fase: { type: "boolean" }, semanas: { type: "integer", minimum: 1, maximum: 52 },
      meta: { type: "boolean" }, metaN: { type: "integer", minimum: 1, maximum: 7 }, nuncaDuas: { type: "boolean" } } },
    dias: { type: "array", minItems: 7, maxItems: 7, items: {
      type: "object", additionalProperties: false, required: ["folga", "exercicios"], properties: {
        folga: { type: "boolean" }, nome: { type: "string", maxLength: 40 },
        exercicios: { type: "array", maxItems: 30, items: exercicio } } } }
  }
} as const;

export interface ExercicioSalvo {
  id: string; bibliotecaId: string | null; nome: string | null; musculo: string | null; equipamento: string | null;
  apelido: string | null; acessorios: string[] | null; preparo: "auto" | 0 | 1 | 2 | 3;
  descanso: number | null; descansoPreparo: number | null; series: Serie[];
}
export interface ProtocoloSalvo {
  id: string; versao: number; agenda: "semana" | "sequencia"; descanso: number; descansoPreparo: number; fila: number;
  camada: { fase: boolean; semanas: number; meta: boolean; metaN: number; nuncaDuas: boolean };
  dias: { folga: boolean; nome: string; exercicios: ExercicioSalvo[] }[];
  /* Os itens da biblioteca usados no protocolo, para o app ter nome, músculo e equipamento sem internet. */
  biblioteca: Record<string, ItemSalvo>;
}
export interface ItemSalvo {
  id: string; nome: string; nomePt: string | null; gifUrl: string | null; musculo: string; acessorios: string[];
  equipamento: string; pilhaKg: number | null; instrucoes: string[]; instrucoesPt: string[] | null;
}
export const CAMPOS_DA_BIBLIOTECA = `id, nome, nome_pt as "nomePt", gif_url as "gifUrl", musculo, acessorios, equipamento, pilha_kg as "pilhaKg",
  instrucoes, instrucoes_pt as "instrucoesPt"`;
type Entrada = Omit<ProtocoloSalvo, "id" | "versao" | "fila" | "biblioteca" | "dias"> & { versao: number | null; dias: { folga: boolean; nome?: string; exercicios: ExercicioSalvo[] }[] };

export async function lerProtocolo(c: Cliente): Promise<ProtocoloSalvo | null> {
  const p = (await c.query("select * from overload.protocolos where ativo")).rows[0];
  if (!p) return null;
  const dias = (await c.query("select dia, folga, nome from overload.protocolo_dias where protocolo_id = $1", [p.id])).rows;
  const exs = (await c.query("select * from overload.protocolo_exercicios where protocolo_id = $1 order by dia, ordem", [p.id])).rows;
  const ser = (await c.query(
    "select s.* from overload.protocolo_series s join overload.protocolo_exercicios e on e.id = s.exercicio_id where e.protocolo_id = $1 order by s.ordem",
    [p.id])).rows;
  const seriesDe = new Map<string, Serie[]>();
  for (const s of ser) {
    const lista = seriesDe.get(s.exercicio_id) ?? [];
    lista.push(s.tipo === "NORMAL" ? { tipo: "NORMAL", ger: s.ger, faixa: [s.faixa_min, s.faixa_max] } : { tipo: s.tipo });
    seriesDe.set(s.exercicio_id, lista);
  }
  return {
    id: p.id, versao: p.versao, agenda: p.agenda, descanso: p.descanso, descansoPreparo: p.descanso_preparo, fila: p.fila,
    camada: { fase: p.fase, semanas: p.fase_semanas, meta: p.meta, metaN: p.meta_n, nuncaDuas: p.nunca_duas },
    dias: Array.from({ length: 7 }, (_, d) => ({
      folga: dias.find(x => x.dia === d)?.folga ?? true,
      nome: dias.find(x => x.dia === d)?.nome ?? "",
      exercicios: exs.filter(e => e.dia === d).map(e => ({
        id: e.id, bibliotecaId: e.biblioteca_id, nome: e.nome, musculo: e.musculo, equipamento: e.equipamento, apelido: e.apelido,
        acessorios: e.acessorios, preparo: e.preparo ?? "auto", descanso: e.descanso, descansoPreparo: e.descanso_preparo,
        series: seriesDe.get(e.id) ?? []
      }))
    })),
    biblioteca: Object.fromEntries((await c.query(
      `select ${CAMPOS_DA_BIBLIOTECA} from overload.biblioteca where id = any($1)`,
      [[...new Set(exs.map(e => e.biblioteca_id).filter(Boolean))]])).rows.map(i => [i.id, i]))
  };
}

export class Conflito extends Error {
  readonly atual: ProtocoloSalvo | null;
  constructor(atual: ProtocoloSalvo | null) { super("versão do protocolo mudou"); this.atual = atual; }
}

export async function gravarProtocolo(c: Cliente, e: Entrada): Promise<ProtocoloSalvo> {
  const atual = (await c.query("select id, versao from overload.protocolos where ativo for update")).rows[0] as { id: string; versao: number } | undefined;
  if ((atual?.versao ?? null) !== e.versao) throw new Conflito(await lerProtocolo(c));
  const valores = [e.agenda, e.descanso, e.descansoPreparo, e.camada.fase, e.camada.semanas, e.camada.meta, e.camada.metaN, e.camada.nuncaDuas];
  let id: string;
  if (atual) {
    id = atual.id;
    await c.query(`update overload.protocolos set agenda = $2, descanso = $3, descanso_preparo = $4, fase = $5, fase_semanas = $6,
                   meta = $7, meta_n = $8, nunca_duas = $9, versao = versao + 1, atualizado_em = now(),
                   fila = case when agenda = $2 then fila else 0 end where id = $1`, [id, ...valores]);
    await c.query("delete from overload.protocolo_dias where protocolo_id = $1", [id]);
  } else {
    id = (await c.query(`insert into overload.protocolos (agenda, descanso, descanso_preparo, fase, fase_semanas, meta, meta_n, nunca_duas)
                         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`, valores)).rows[0].id;
  }
  for (let d = 0; d < 7; d++) {
    const dia = e.dias[d]!;
    await c.query("insert into overload.protocolo_dias (protocolo_id, dia, folga, nome) values ($1, $2, $3, $4)", [id, d, dia.folga, dia.nome ?? ""]);
    for (const [ordem, x] of dia.exercicios.entries()) {
      await c.query(`insert into overload.protocolo_exercicios (id, protocolo_id, dia, ordem, biblioteca_id, nome, musculo, equipamento,
                     apelido, acessorios, preparo, descanso, descanso_preparo) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [x.id, id, d, ordem, x.bibliotecaId ?? null, x.nome ?? null, x.musculo ?? null, x.equipamento ?? null, x.apelido ?? null,
         x.acessorios ?? null, x.preparo === "auto" ? null : x.preparo, x.descanso ?? null, x.descansoPreparo ?? null]);
      for (const [o, s] of x.series.entries()) {
        await c.query("insert into overload.protocolo_series (exercicio_id, ordem, tipo, ger, faixa_min, faixa_max) values ($1, $2, $3, $4, $5, $6)",
          [x.id, o, s.tipo, s.tipo === "NORMAL" ? s.ger : null, s.tipo === "NORMAL" ? s.faixa[0] : null, s.tipo === "NORMAL" ? s.faixa[1] : null]);
      }
    }
  }
  return (await lerProtocolo(c))!;
}

export function rotasDeProtocolo(app: FastifyInstance, pool: pg.Pool) {
  app.get("/protocolo", { preHandler: exigirConta }, async req => ({ protocolo: await transacao(pool, req.contaId, lerProtocolo) }));

  app.put("/protocolo", { preHandler: exigirConta, schema: { body: esquemaProtocolo } }, async (req, reply) => {
    try {
      return { protocolo: await transacao(pool, req.contaId, c => gravarProtocolo(c, req.body as Entrada)) };
    } catch (e) {
      if (e instanceof Conflito) return reply.code(409).send({ erro: "O plano mudou em outro aparelho.", protocolo: e.atual });
      const codigo = (e as { code?: string }).code;
      // Violação de restrição do banco: entrada que o app oficial não manda.
      if (codigo?.startsWith("23")) return reply.code(400).send({ erro: "Plano inválido.", detalhe: (e as Error).message });
      throw e;
    }
  });
}

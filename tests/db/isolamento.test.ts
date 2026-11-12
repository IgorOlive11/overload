// Só o dono: cada conta lê e grava apenas as próprias linhas, uma segunda conta não lê, não altera e não apaga,
// e sem conta nada aparece. Roda contra um Postgres de verdade (veja tests/db/apoio.ts).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type pg from "pg";
import { bancoDeTeste, comoConta, novaConta, semBanco, type Banco } from "./apoio.ts";

let banco: Banco;
let a: string;
let b: string;

const conta = (id: string | null, fn: (c: pg.PoolClient) => Promise<unknown>) => comoConta(banco.api, id, fn);
const contar = async (c: pg.PoolClient, tabela: string) =>
  Number((await c.query(`select count(*)::int as n from overload.${tabela}`)).rows[0].n);

async function protocoloCompleto(c: pg.PoolClient) {
  const p = (await c.query("insert into overload.protocolos (agenda, descanso, descanso_preparo) values ('semana', 120, 40) returning id")).rows[0].id as string;
  await c.query("insert into overload.protocolo_dias (protocolo_id, dia) values ($1, 0)", [p]);
  const e = randomUUID();
  await c.query("insert into overload.protocolo_exercicios (id, protocolo_id, dia, ordem, nome, musculo, equipamento) values ($1, $2, 0, 0, 'Supino', 'PEITO', 'barra')", [e, p]);
  await c.query("insert into overload.protocolo_series (exercicio_id, ordem, tipo, ger, faixa_min, faixa_max) values ($1, 0, 'NORMAL', 10, 8, 10)", [e]);
  const s = randomUUID();
  await c.query("insert into overload.sessoes_treino (id, protocolo_id, dia, indice_treino, dia_local, iniciada_em) values ($1, $2, 0, 0, '2026-11-11', now())", [s, p]);
  const r = randomUUID();
  await c.query(`insert into overload.registros_serie (id, sessao_id, exercicio_chave, exercicio_id, configuracao, passo, ordem, tipo, kg, reps, ger, feito_em)
                 values ($1, $2, 'nome:SUPINO', $3, 'N10:8-10', 'valida', 0, 'NORMAL', 60, 9, 9, now())`, [r, s, e]);
  await c.query("insert into overload.sessoes_login (token_hash) values (decode(repeat('ab', 32), 'hex'))");
  const i = (await c.query("insert into overload.ideias (texto) values ('Trocar a flexora pela adutora') returning id")).rows[0].id as string;
  return { p, e, s, r, i };
}

const TABELAS = ["contas", "sessoes_login", "protocolos", "protocolo_dias", "protocolo_exercicios", "protocolo_series", "sessoes_treino", "registros_serie", "ideias"];

describe("isolamento por conta no banco", { skip: semBanco }, () => {
  let ids: Awaited<ReturnType<typeof protocoloCompleto>>;

  before(async () => {
    banco = await bancoDeTeste();
    a = await novaConta(banco.api, "Conta A");
    b = await novaConta(banco.api, "Conta B");
    ids = await conta(a, protocoloCompleto) as typeof ids;
  });
  after(async () => { await banco?.fechar(); });

  test("a API não é dona das tabelas e não ignora a RLS", async () => {
    const papel = await banco.api.query("select rolsuper, rolbypassrls from pg_roles where rolname = 'overload_api'");
    assert.deepEqual(papel.rows[0], { rolsuper: false, rolbypassrls: false });
    const donas = await banco.api.query("select tablename from pg_tables where schemaname = 'overload' and tableowner = 'overload_api'");
    assert.equal(donas.rowCount, 0);
    const semRls = await banco.api.query(
      "select tablename from pg_tables where schemaname = 'overload' and not rowsecurity and tablename not in ('biblioteca', 'migracoes')");
    assert.deepEqual(semRls.rows, []);
  });

  for (const t of TABELAS) {
    test(`a conta dona lê a própria linha em ${t}`, async () => {
      await conta(a, async c => assert.ok((await contar(c, t)) >= 1));
    });
    test(`uma segunda conta não lê as linhas da primeira em ${t}`, async () => {
      await conta(b, async c => assert.equal(await contar(c, t), t === "contas" ? 1 : 0));
    });
    test(`sem conta, nada aparece em ${t}`, async () => {
      await conta(null, async c => assert.equal(await contar(c, t), 0));
    });
  }

  test("uma segunda conta não altera nem apaga o protocolo da primeira", async () => {
    await conta(b, async c => {
      assert.equal((await c.query("update overload.protocolos set descanso = 60 where id = $1", [ids.p])).rowCount, 0);
      assert.equal((await c.query("delete from overload.protocolos where id = $1", [ids.p])).rowCount, 0);
      assert.equal((await c.query("update overload.contas set nome = 'invasor' where id = $1", [a])).rowCount, 0);
      assert.equal((await c.query("update overload.sessoes_treino set estado = 'cancelada', terminada_em = now() where id = $1", [ids.s])).rowCount, 0);
      assert.equal((await c.query("delete from overload.sessoes_login")).rowCount, 0);
      assert.equal((await c.query("delete from overload.ideias where id = $1", [ids.i])).rowCount, 0);
    });
    await conta(a, async c => assert.equal((await c.query("select descanso from overload.protocolos where id = $1", [ids.p])).rows[0].descanso, 120));
  });

  test("uma segunda conta não grava linha em nome da primeira", async () => {
    await assert.rejects(conta(b, c => c.query(
      "insert into overload.protocolos (conta_id, agenda, descanso, descanso_preparo) values ($1, 'semana', 120, 40)", [a])), /row-level security/);
  });

  test("uma segunda conta não pendura linha no protocolo da primeira", async () => {
    await assert.rejects(conta(b, c => c.query("insert into overload.protocolo_dias (protocolo_id, dia) values ($1, 3)", [ids.p])), /foreign key/);
    await assert.rejects(conta(b, c => c.query(
      "insert into overload.sessoes_treino (id, protocolo_id, dia, indice_treino, dia_local, iniciada_em) values ($1, $2, 0, 0, '2026-11-11', now())",
      [randomUUID(), ids.p])), /foreign key/);
    await assert.rejects(conta(b, c => c.query(
      `insert into overload.registros_serie (id, sessao_id, exercicio_chave, configuracao, passo, ordem, tipo, kg, reps, feito_em)
       values ($1, $2, 'x', 'N10:8-10', 'valida', 0, 'NORMAL', 1, 1, now())`, [randomUUID(), ids.s])), /foreign key/);
  });

  test("ideia: a conta dona apaga a própria, e a API não altera texto", async () => {
    await assert.rejects(conta(a, c => c.query("update overload.ideias set texto = 'x' where id = $1", [ids.i])), /permission denied/);
    await assert.rejects(conta(a, c => c.query("insert into overload.ideias (texto) values ('   ')")), /check/);
    const nova = await conta(a, async c => (await c.query("insert into overload.ideias (texto) values ('Apagar depois') returning id")).rows[0].id) as string;
    await conta(a, async c => assert.equal((await c.query("delete from overload.ideias where id = $1", [nova])).rowCount, 1));
  });

  test("registro de série só é acrescentado: a API não altera nem apaga", async () => {
    await assert.rejects(conta(a, c => c.query("update overload.registros_serie set kg = 100 where id = $1", [ids.r])), /permission denied/);
    await assert.rejects(conta(a, c => c.query("delete from overload.registros_serie where id = $1", [ids.r])), /permission denied/);
  });

  test("reenviar o mesmo registro não duplica", async () => {
    const id = randomUUID();
    const inserir = (c: pg.PoolClient) => c.query(
      `insert into overload.registros_serie (id, sessao_id, exercicio_chave, configuracao, passo, ordem, kg, reps, feito_em)
       values ($1, $2, 'nome:SUPINO', 'N10:8-10', 'preparo', 0, 30, 8, now()) on conflict (id) do nothing`, [id, ids.s]);
    await conta(a, inserir);
    await conta(a, inserir);
    await conta(a, async c => assert.equal((await c.query("select count(*)::int n from overload.registros_serie where id = $1", [id])).rows[0].n, 1));
  });

  test("a sessão só anda para a frente", async () => {
    await conta(a, async c => {
      await c.query("update overload.sessoes_treino set estado = 'encerrada', terminada_em = now() where id = $1", [ids.s]);
    });
    await assert.rejects(conta(a, c => c.query("update overload.sessoes_treino set estado = 'em_andamento', terminada_em = null where id = $1", [ids.s])), /já terminou/);
  });

  test("as regras do app valem no banco: GER, faixa e tipo de série", async () => {
    await assert.rejects(conta(a, c => c.query("insert into overload.protocolo_series (exercicio_id, ordem, tipo, ger, faixa_min, faixa_max) values ($1, 1, 'NORMAL', 14, 8, 10)", [ids.e])), /check/);
    await assert.rejects(conta(a, c => c.query("insert into overload.protocolo_series (exercicio_id, ordem, tipo, ger, faixa_min, faixa_max) values ($1, 1, 'NORMAL', 10, 10, 8)", [ids.e])), /check/);
    await assert.rejects(conta(a, c => c.query("insert into overload.protocolo_series (exercicio_id, ordem, tipo) values ($1, 1, 'WIDOWMAKER')", [ids.e])), /check/);
    await conta(a, c => c.query("insert into overload.protocolo_series (exercicio_id, ordem, tipo) values ($1, 1, 'REST_PAUSE')", [ids.e]));
  });

  test("a API não lê tokens nem a fila de e-mail diretamente", async () => {
    await assert.rejects(conta(a, c => c.query("select * from overload.tokens_email")), /permission denied/);
    await assert.rejects(conta(a, c => c.query("select * from overload.tarefas_email")), /permission denied/);
  });

  test("a biblioteca é lida por qualquer conta e não é gravada pela API", async () => {
    await conta(b, c => c.query("select * from overload.biblioteca"));
    await assert.rejects(conta(b, c => c.query("insert into overload.biblioteca (id, nome, musculo, equipamento) values ('x', 'x', 'PEITO', 'barra')")), /permission denied/);
  });
});

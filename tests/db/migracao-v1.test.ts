// Migração do v1: conversão e gravação no v2, com dados inventados no formato do v1 (nenhum dado de pessoa real).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import pg from "pg";
import { equipamentoDoV1, itemDaBiblioteca, migrarConta, semanaParada, type ContaV1, type ItemV1 } from "../../db/v1/converter.ts";
import { gravarConta, gravarItens } from "../../db/v1/gravar.ts";
import { registroDaApi } from "../../src/domain/historico.ts";
import { sugestao } from "../../src/domain/progressao.ts";
import { bancoDeTeste, comoConta, semBanco, type Banco } from "./apoio.ts";

const item = (id: string, name: string, eq: string, alvo = "quads", sec: string[] = ["glutes"]): ItemV1 => ({
  id, name, name_pt: null, gif_url: `https://static.exercisedb.dev/media/${id}.gif`, target_muscles: [alvo], secondary_muscles: sec,
  equipments: [eq], body_parts: ["upper legs"], instructions: ["Passo 1"], instructions_pt: null
});
const ITENS: ItemV1[] = [
  item("hackX", "hack squat", "sled machine"),
  item("flexX", "lever lying leg curl", "leverage machine", "hamstrings", []),
  { ...item("custom-puxada-abc123", "Puxada Alta", "Máquina", "COSTAS", ["BÍCEPS"]), gif_url: "https://abcdefgh.supabase.co/storage/v1/object/public/exercises/custom-puxada-abc123.gif" }
];
const biblioteca = new Map(ITENS.map(i => [i.id, itemDaBiblioteca(i)]));

const N = (ger: number, rr: string) => ({ id: randomUUID(), type: "NORMAL", ger, repRange: rr });
const dia = (exs: object[]) => ({ isRest: false, restSeconds: 120, prepRestSeconds: 40, exercises: exs });
const folga = { isRest: true, exercises: [] };
const semana = (exs: object[]) => ({ weekType: "normal", days: [dia(exs), folga, folga, folga, folga, folga, folga] });

function contaFake(): ContaV1 {
  const hack = { id: "a", name: "Hack squat", libraryId: "hackX", muscle: "QUADRÍCEPS", accessoryMuscle: "GLÚTEOS", prepSetsOverride: 2, sets: [N(8, "8-12"), N(8, "8-12")] };
  const flex = { id: "b", name: "Cadeira flexora", libraryId: "flexX", muscle: "POSTERIOR", sets: [N(9, "6-10"), { id: "p", type: "PULSE", ger: 9, repRange: "" }] };
  const caseira = { id: "c", name: "Abdominal da casa", muscle: "CORE", sets: [N(9, "8-12")] };
  return {
    id: randomUUID(), email: `v1-${randomUUID().slice(0, 8)}@exemplo.test`, nome: "Pessoa Inventada", senhaHash: bcrypt.hashSync("senha do v1", 4),
    confirmadoEm: "2026-05-01T12:00:00Z", criadaEm: "2026-05-01T12:00:00Z",
    secoes: {
      userProtocol: { totalWeeks: 2, weekRanges: [], weeks: [semana([hack]), semana([hack, flex, caseira])] },
      workoutSessions: [
        { dayIdx: 0, weekIdx: 0, startedAt: "2026-08-10T20:00:00Z", completedAt: "2026-08-10T21:00:00Z", durationSec: 3600 },
        { dayIdx: 0, weekIdx: 1, startedAt: "2026-08-17T20:00:00Z", completedAt: "2026-08-17T21:00:00Z", durationSec: 3600 }
      ],
      logs: {
        w1_d0_e0: {
          name: "Hack squat", date: "2026-08-17T21:00:01Z", kg: 80,
          sets: [{ kg: 80, reps: 12, setType: "NORMAL", repRange: "8-12" }, { kg: 80, reps: 12, setType: "NORMAL", repRange: "8-12" }],
          feeders: [{ kg: 45, reps: 8 }, { kg: 60, reps: 6 }], warmups: [],
          history: [{ name: "Hack squat", date: "2026-08-10T21:00:02Z", kg: 75, sets: [{ kg: 75, reps: 10, setType: "NORMAL", repRange: "8-12" }, { kg: 75, reps: 9, setType: "NORMAL", repRange: "8-12" }], feeders: [] }]
        },
        w1_d0_e1: {
          name: "Cadeira flexora", date: "2026-08-17T21:00:03Z", kg: 40,
          sets: [{ kg: 40, reps: 8, setType: "NORMAL", repRange: "6-10" }, { kg: 40, setType: "PULSE" }], feeders: [], history: []
        },
        w1_d0_e2: {
          name: "Rosca no cabo", date: "2026-07-01T22:00:00Z", kg: 20,
          sets: [{ kg: 20, setType: "REST_PAUSE", blocks: [{ reps: 9 }, { reps: 4 }] }, { kg: 20, setType: "MUSCLE_ROUND", blocks: [{ reps: 4 }, { reps: 4 }, { reps: 3 }], failedBlock: 3, failedReps: 3 }],
          feeders: [], history: []
        }
      },
      // O mesmo registro do logs também aparece no exerciseHistory: não pode duplicar.
      exerciseHistory: { "Hack squat": { date: "2026-08-17T21:00:01Z", kg: 80, sets: [{ kg: 80, reps: 12, setType: "NORMAL", repRange: "8-12" }], feeders: [] } },
      mealLog: { qualquer: 1 }
    }
  };
}

test("migração v1: equipamento vira categoria, e o que não cabe vira máquina de placas", () => {
  assert.equal(equipamentoDoV1(["barbell"]), "barra");
  assert.equal(equipamentoDoV1(["Máquina (Smith)"]), "smith");
  assert.equal(equipamentoDoV1(["dumbbell"]), "halteres");
  assert.equal(equipamentoDoV1(["leverage machine"]), "carregada");
  assert.equal(equipamentoDoV1(["cable"]), "pilha");
  assert.equal(equipamentoDoV1(["body weight"]), "pilha");
});

test("migração v1: os GIFs do bucket do Supabase passam a ser servidos pelo app, em /biblioteca", () => {
  assert.equal(biblioteca.get("custom-puxada-abc123")!.gifUrl, "/biblioteca/custom-puxada-abc123.gif");
  assert.equal(biblioteca.get("hackX")!.gifUrl, "https://static.exercisedb.dev/media/hackX.gif");
  assert.equal(biblioteca.get("hackX")!.musculo, "QUADRÍCEPS");
  assert.deepEqual(biblioteca.get("hackX")!.acessorios, ["GLÚTEOS"]);
});

test("migração v1: a semana-tipo é a semana em que a pessoa parou", () => {
  const m = migrarConta(contaFake(), biblioteca);
  assert.equal(semanaParada(contaFake().secoes.workoutSessions as unknown[], 2), 1);
  const exs = m.protocolo!.dias[0]!.exercicios;
  assert.equal(exs.length, 3);
  assert.equal(m.protocolo!.dias.filter(d => !d.folga).length, 1);
  assert.equal(exs[0]!.preparo, 2);
});

test("migração v1: série pulse vira normal com a mesma faixa e GER", () => {
  const exs = migrarConta(contaFake(), biblioteca).protocolo!.dias[0]!.exercicios;
  assert.deepEqual(exs[1]!.series, [{ tipo: "NORMAL", ger: 9, faixa: [6, 10] }, { tipo: "NORMAL", ger: 9, faixa: [6, 10] }]);
});

test("migração v1: exercício sem item na biblioteca entra como item novo, para continuar ligado", () => {
  const m = migrarConta(contaFake(), biblioteca);
  assert.ok(m.novosItens.some(i => i.id === "v1-abdominal-da-casa" && i.musculo === "CORE"));
  assert.equal(m.protocolo!.dias[0]!.exercicios[2]!.bibliotecaId, "v1-abdominal-da-casa");
});

test("migração v1: o histórico vira sessões e registros sem duplicar, e a última vez sugere a carga certa", () => {
  const m = migrarConta(contaFake(), biblioteca);
  // Duas sessões do workoutSessions e uma criada para o registro de julho, que não tinha sessão.
  assert.equal(m.sessoes.length, 3);
  const hack = m.registros.filter(r => r.exercicioChave === "hackX" && r.passo === "valida");
  assert.equal(hack.length, 4);
  // A configuração bate com a do protocolo migrado, então a última vez fica ligada.
  const ultima = hack.filter(r => r.sessaoId === m.sessoes[2]!.id);
  const series = m.protocolo!.dias[0]!.exercicios[0]!.series;
  const reg = registroDaApi(ultima.map(r => ({ ...r })), series)!;
  assert.equal(sugestao(series, reg, "carregada").kg, 85);
  // Pulse não tem repetições: fica de fora e vira aviso.
  assert.ok(m.avisos.some(a => a.includes("sem repetições")));
  const mr = m.registros.find(r => r.tipo === "MUSCLE_ROUND")!;
  assert.deepEqual([mr.blocos, mr.ultimo], [2, 3]);
  const rp = m.registros.find(r => r.tipo === "REST_PAUSE")!;
  assert.deepEqual([rp.b1, rp.b2], [9, 4]);
});

describe("migração v1 gravada no banco", { skip: semBanco }, () => {
  let banco: Banco;
  before(async () => { banco = await bancoDeTeste(); });
  after(async () => { await banco?.fechar(); });

  test("migração v1: a conta entra com a mesma senha, o protocolo e o histórico, e só a dona vê", async () => {
    const dono = new pg.Client({ connectionString: banco.urlDono });
    await dono.connect();
    const c = contaFake(), m = migrarConta(c, biblioteca);
    try {
      await dono.query("begin"); await gravarItens(dono, [...biblioteca.values()]); await gravarConta(dono, m); await dono.query("commit");
    } finally { await dono.end(); }
    await comoConta(banco.api, c.id, async x => {
      const conta = (await x.query("select senha_hash, origem from overload.contas")).rows[0];
      assert.equal(conta.origem, "v1");
      assert.ok(bcrypt.compareSync("senha do v1", conta.senha_hash));
      assert.equal((await x.query("select count(*)::int n from overload.sessoes_treino where estado = 'concluida'")).rows[0].n, 3);
      assert.equal((await x.query("select count(*)::int n from overload.registros_serie")).rows[0].n, m.registros.length);
      assert.equal((await x.query("select count(*)::int n from overload.protocolo_exercicios")).rows[0].n, 3);
    });
    await comoConta(banco.api, randomUUID(), async x => assert.equal((await x.query("select count(*)::int n from overload.registros_serie")).rows[0].n, 0));
  });
});

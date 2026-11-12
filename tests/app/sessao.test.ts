// Sessão de treino: passos, corte do preparo, julgamento, descanso e correção, como em design/mock/sessao.js.
import assert from "node:assert/strict";
import { test } from "node:test";
import { concluir, corrigir, iniciar, kgDoPasso, resumoDoPasso, type ExercicioDaSessao } from "../../src/domain/sessao.ts";
import { ArmazemEmMemoria, Fila } from "../../src/lib/fila.ts";
import type { ExercicioDoTreino, Registro, Serie } from "../../src/domain/tipos.ts";

const N = (ger: number, a: number, b: number): Serie => ({ tipo: "NORMAL", ger, faixa: [a, b] });
const ex = (id: string, series: Serie[], ultimo: Registro | null, t: Partial<ExercicioDoTreino> = {}): ExercicioDaSessao => ({
  uid: crypto.randomUUID(), id, nome: id.toUpperCase(), pilhaKg: null, chave: id, configuracao: "x", ultimo,
  treino: { musculo: "QUADRÍCEPS", acessorios: [], equipamento: "barra", series, preparo: "auto", descanso: 120, descansoPreparo: 60, ...t }
});
const nova = (lista: ExercicioDaSessao[], diasParado = 0) => iniciar({
  id: crypto.randomUUID(), titulo: "Treino", dia: 0, indiceTreino: 0, protocoloId: null, protocoloVersao: null,
  diaLocal: "2026-11-12", inicio: 0, diasParado, lista
});

test("a sessão vira calibração, três preparos do estreante e as séries válidas", () => {
  const s = nova([ex("hack", [N(8, 8, 12), N(8, 8, 12)], null)]);
  assert.deepEqual(s.passos.map(p => p.tipo), ["CALIBRACAO", "PREPARO", "PREPARO", "PREPARO", "TRABALHO", "TRABALHO"]);
  assert.equal(s.wk[0]!.cartao.modo, "pergunta");
});

test("a carga confirmada na calibração vale para os preparos e as séries, e não há descanso depois da calibração", () => {
  const s = nova([ex("hack", [N(8, 8, 12)], null)]);
  const c = concluir(s, { kg: 100 }, 0);
  assert.equal(c.descanso, 0);
  assert.equal(s.descanso, null);
  assert.equal(kgDoPasso(s, 1), 55);
  assert.equal(kgDoPasso(s, 4), 100);
});

test("o descanso antes do próximo passo guarda o fim em hora absoluta, para sobreviver a recarregar a página", () => {
  const s = nova([ex("hack", [N(8, 8, 12)], null)]);
  concluir(s, { kg: 100 }, 0);
  concluir(s, { kg: 55, reps: 10 }, 1000);
  assert.equal(s.descanso?.fim, 1000 + 60_000);
  assert.equal(s.descanso?.tipo, "Descanso do preparo");
});

test("o preparo que já chega à carga de trabalho é pulado, e o primeiro nunca", () => {
  // Barra vazia: 55%, 70% e 85% de 20 kg arredondam para 20, igual à carga de trabalho.
  const s = nova([ex("rosca", [N(8, 4, 6)], null)]);
  concluir(s, { kg: 20 }, 0);
  concluir(s, { kg: 20, reps: 8 }, 0);
  assert.equal(s.passos[s.i]!.tipo, "TRABALHO");
  assert.equal(resumoDoPasso(s, 2), "pulado, igual à série válida");
});

test("bater o topo da faixa em todas as séries sobe a carga do exercício", () => {
  const s = nova([ex("hack", [N(8, 8, 12)], null, { preparo: 0 })]);
  concluir(s, { kg: 100 }, 0);
  const c = concluir(s, { reps: 12, ger: 8 }, 0);
  assert.ok(c.terminou);
  assert.equal(s.wk[0]!.sobe, true);
  assert.equal(s.wk[0]!.proxima, 105);
  assert.equal(s.sobem, 1);
  assert.match(c.avisos.map(a => a.titulo).join(), /Progressão: HACK/);
});

test("mais repetições com a mesma carga da última vez é recorde nesta série", () => {
  const s = nova([ex("hack", [N(8, 8, 12), N(8, 8, 12)], { kg: 100, resultados: [{ reps: 10, ger: 8 }, { reps: 9, ger: 8 }] }, { preparo: 0 })]);
  assert.equal(s.wk[0]!.cartao.modo, "hold");
  concluir(s, { kg: 100 }, 0);
  const c = concluir(s, { reps: 11, ger: 8 }, 0);
  assert.equal(c.avisos[0]!.titulo, "Recorde nesta série");
});

test("corrigir a carga da calibração vale para as séries que faltam", () => {
  const s = nova([ex("hack", [N(8, 8, 12), N(8, 8, 12)], null, { preparo: 0 })]);
  concluir(s, { kg: 100 }, 0);
  corrigir(s, 0, { kg: 90 });
  assert.equal(kgDoPasso(s, 2), 90);
});

test("cancelar o treino tira da fila a sessão e os registros que ainda não foram", async () => {
  const fila = new Fila(new ArmazemEmMemoria(), async () => ({ recusas: [] }));
  await fila.acrescentar({ tipo: "sessao", id: "s1", dados: { id: "s1", estado: "em_andamento" } }, { tipo: "registro", id: "r1", dados: { sessaoId: "s1" } });
  assert.equal(await fila.descartar("s1"), true);
  assert.equal(fila.atual.pendentes, 0);
});

test("cancelar uma sessão que já foi para a API mantém a sessão na fila para enviar como cancelada", async () => {
  const fila = new Fila(new ArmazemEmMemoria(), async () => ({ recusas: [] }));
  await fila.acrescentar({ tipo: "sessao", id: "s1", dados: { id: "s1", estado: "em_andamento" } });
  await fila.enviar();
  await fila.acrescentar({ tipo: "registro", id: "r1", dados: { sessaoId: "s1" } });
  assert.equal(await fila.descartar("s1"), false);
  assert.equal(fila.atual.pendentes, 0);
});

import { gradeDeSemanas, resumoDaFase, vezesQueSubiu } from "../../src/domain/progresso.ts";

test("progresso: a grade mostra a fase inteira, marca a próxima vaga da semana atual e a vaga de bônus", () => {
  const fase = { ligada: true, semanas: 6, meta: 2 };
  // Semana 1 com 3 treinos (bônus), semana 2 com 2, semana 3 com 1; hoje é a semana 3.
  const g = gradeDeSemanas([0, 2, 4, 7, 9, 14], 15, fase);
  assert.equal(g.length, 6);
  assert.deepEqual(g[0]!.celulas, ["done", "done", "bonus done"]);
  assert.deepEqual(g[2]!.celulas, ["done", "next", "bonus"]);
  assert.equal(g[2]!.atual, true);
  const r = resumoDaFase([0, 2, 4, 7, 9, 14], 15, fase);
  assert.deepEqual(r, { semana: 3, feitos: 6, possiveis: 6, completas: 2, naMeta: 2 });
});

test("progresso: a carga sobe quando passa da sessão anterior no mesmo exercício e na mesma configuração", () => {
  const c = (chave: string, configuracao: string, kg: number) => ({ chave, configuracao, diaLocal: "2026-11-01", kg });
  assert.equal(vezesQueSubiu([c("a", "x", 60), c("a", "x", 65), c("a", "y", 70), c("a", "x", 65), c("a", "x", 70)]), 2);
});

// Montador do Plano: modelos prontos, aviso de dias e alertas da revisão, como no mock (design/mock/plano-simples.js).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import {
  alertasDaSemana, avisoDeDias, cabe, conflitosDeDescanso, diasDeTreino, doModelo, paraApi, precisaAviso, resumoDoEx, sincronizarDias, type Bib
} from "../../src/lib/plano.ts";

// A biblioteca de exemplo do próprio mock.
const ctx: { LIB?: Record<string, { name: string; m: string; acc: string[]; eq: string; max?: number }> } = {};
vm.createContext(ctx);
vm.runInContext(readFileSync("design/mock/regras.js", "utf8") + "\nthis.LIB = LIB;", ctx);
const bib = Object.fromEntries(Object.entries(ctx.LIB!).map(([id, L]) => [id, { nome: L.name, musculo: L.m, acessorios: L.acc, equipamento: L.eq, pilhaKg: L.max ?? null }])) as Bib;

const modelo = (k: "ul" | "ppl", mascara?: number[]) => {
  const d = doModelo(k, bib, mascara ? [0, 1, 2, 3, 4, 5, 6].map(i => mascara.includes(i)) : undefined);
  sincronizarDias(d);
  return d;
};

test("Superior e inferior nos 4 dias padrão cabe, sem aviso e sem alerta na revisão", () => {
  const d = modelo("ul");
  assert.deepEqual(diasDeTreino(d), [0, 1, 3, 4]);
  assert.deepEqual(d.nomes.filter(Boolean), ["Superior A", "Inferior A", "Superior B", "Inferior B"]);
  assert.equal(cabe(d), true);
  assert.equal(precisaAviso(d), false);
  assert.deepEqual(alertasDaSemana(d, bib), []);
});

test("Empurrar, puxar e pernas roda 2 vezes em 6 dias, em fila, sem a mesma parte em dias seguidos", () => {
  const d = modelo("ppl", [0, 1, 2, 3, 4, 5]);
  d.agenda = "sequencia";
  assert.deepEqual(d.nomes.slice(0, 6), ["Empurrar", "Puxar", "Pernas", "Empurrar", "Puxar", "Pernas"]);
  assert.deepEqual(conflitosDeDescanso(d, "sequencia"), []);
});

test("Superior e inferior em 3 dias avisa, sugere a fila e oferece trocar para Empurrar, puxar e pernas", () => {
  const d = modelo("ul", [0, 2, 4]);
  const a = avisoDeDias(d)!;
  assert.equal(a.titulo, "Menos dias que o modelo");
  assert.equal(a.cabecalho, "Você marcou 3 dias, e este modelo foi feito para 4.");
  assert.equal(a.trocarParaPpl, true);
  assert.match(a.rotuloMascara ?? "", /^Completar 4 dias: incluir /);
});

test("7 dias marcados avisa que não sobra descanso", () => {
  const a = avisoDeDias(modelo("ul", [0, 1, 2, 3, 4, 5, 6]))!;
  assert.equal(a.titulo, "Sem dia de descanso");
  assert.equal(a.semDescanso, true);
});

test("o resumo do exercício conta o aquecimento e as séries válidas como no mock", () => {
  const d = modelo("ul");
  const r = resumoDoEx(d, d.dias[0]!.exercicios, 0, bib);
  // Supino inclinado no Smith abre a sessão: peito estreante, 3 de preparo, 2 válidas de 6 a 8.
  assert.equal(r.texto, "5 séries: 3 de aquecimento + 2 válidas · 6 a 8");
});

test("um treino que se repete na semana sai com um id de exercício por dia para o servidor", () => {
  const d = modelo("ppl", [0, 1, 2, 3, 4, 5]);
  const ids = paraApi(d, null).dias.flatMap(x => x.exercicios.map(e => e.id));
  assert.equal(new Set(ids).size, ids.length);
});

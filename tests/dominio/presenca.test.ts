// Presença, semana de ajuste, fase e conquistas. Não há função pura no mock para comparar (ele simula com contadores),
// então cada regra do rascunho (docs/produto/rascunho-regras.md) vira um teste com o texto dela.
import { test } from "node:test";
import assert from "node:assert/strict";
import { avisoDeVolta, conquistaNova, conquistadas, diaCorrido, filaDepois, presenca } from "../../src/domain/index.ts";

const fase = { ligada: true, semanas: 6, meta: 3 };

test("A semana de ajuste, a meta semanal e a fase só começam a contar no primeiro treino", () => {
  const p = presenca([], 500, fase);
  assert.deepEqual(p, { semana: 1, feitosNaSemana: 0, meta: 3, total: 0, ajusteRestante: 7, travado: false, faseTerminou: false });
});

test("Nos 7 dias depois do primeiro treino o plano fica editável, e só depois a fase trava", () => {
  assert.equal(presenca([100], 106, fase).ajusteRestante, 1);
  assert.equal(presenca([100], 106, fase).travado, false);
  assert.equal(presenca([100], 107, fase).ajusteRestante, 0);
  assert.equal(presenca([100], 107, fase).travado, true);
});

test("Com a fase desligada, o plano nunca trava", () => {
  assert.equal(presenca([100], 130, { ...fase, ligada: false }).travado, false);
});

test("Quando a fase termina, o plano destrava", () => {
  const p = presenca([100], 100 + 6 * 7, fase);
  assert.equal(p.semana, 7);
  assert.equal(p.faseTerminou, true);
  assert.equal(p.travado, false);
});

test("A presença conta os treinos da semana da fase contra a meta, sem punir falta", () => {
  const p = presenca([100, 102, 104, 108, 109], 110, fase);
  assert.equal(p.semana, 2);
  assert.equal(p.feitosNaSemana, 2);
  assert.equal(p.total, 5);
});

test("Encerrar aqui conta como presença: a fila anda para o treino seguinte e recomeça no fim", () => {
  assert.equal(filaDepois("sequencia", 0, 3, 0), 1);
  assert.equal(filaDepois("sequencia", 2, 3, 2), 0);
  assert.equal(filaDepois("semana", 1, 3, 0), 0);
});

test("Conquistas por número de treinos: Primeira missão com 1, Habitué com 5, Veterano com 10 e Doom slayer com 30", () => {
  assert.deepEqual(conquistadas(0), []);
  assert.deepEqual(conquistadas(10).map(c => c.nome), ["Primeira missão", "Habitué", "Veterano"]);
  assert.equal(conquistaNova(30)?.nome, "Doom slayer");
  assert.equal(conquistaNova(31), undefined);
});

test("De 15 a 27 dias sem treinar a carga continua a mesma; a partir de 28 dias vem 10% mais leve", () => {
  assert.equal(avisoDeVolta(14), null);
  assert.match(avisoDeVolta(15) ?? "", /^15 dias fora\..*a carga continua a mesma/);
  assert.match(avisoDeVolta(28) ?? "", /10% mais leve/);
});

test("O dia corrido ignora a hora do dia", () => {
  assert.equal(diaCorrido(new Date(2026, 10, 11, 0, 5)), diaCorrido(new Date(2026, 10, 11, 23, 55)));
  assert.equal(diaCorrido(new Date(2026, 10, 12)) - diaCorrido(new Date(2026, 10, 11)), 1);
});

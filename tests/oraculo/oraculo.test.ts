// O domínio (src/domain) devolve o mesmo que as regras do mock para cada caso gerado em gerar.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarCasos } from "./gerar.mjs";
import { arredondar, cartao, descansoAntes, estimativaMin, passos, perguntaDeCarga, preparo } from "../../src/domain/index.ts";

const casos = gerarCasos();
const plano = (x: unknown) => JSON.parse(JSON.stringify(x));

test("A sugestão de carga e o cartão da calibração são os do mock em todos os casos", () => {
  let falhas = 0;
  for (const { entrada: e, esperado } of casos.cartao) {
    const obtido = plano(cartao(e.series, e.ultimo, e.equipamento, e.diasParado));
    try { assert.deepEqual(obtido, esperado); } catch (erro) {
      if (++falhas <= 3) console.error(JSON.stringify(e), "\n", (erro as Error).message);
    }
  }
  assert.equal(falhas, 0, `${falhas} de ${casos.cartao.length} casos diferentes do mock`);
});

test("A pergunta de carga da primeira vez é a do mock para cada tipo e GER", () => {
  for (const { entrada, esperado } of casos.pergunta) assert.equal(perguntaDeCarga(entrada), esperado);
});

test("O arredondamento da carga segue o equipamento como no mock", () => {
  for (const { entrada, esperado } of casos.arredondar) assert.equal(arredondar(entrada.kg, entrada.equipamento), esperado, JSON.stringify(entrada));
});

test("Preparo, passos, descansos e duração estimada da sessão são os do mock", () => {
  for (const { entrada, esperado } of casos.preparo) {
    assert.deepEqual(plano(entrada.map((_: unknown, k: number) => preparo(entrada, k))), esperado.preparos);
    const p = passos(entrada);
    assert.deepEqual(plano(p), esperado.passos);
    assert.deepEqual(p.map((x, i) => descansoAntes(x, p.at(i + 1), entrada)), esperado.descansos);
    assert.equal(estimativaMin(entrada), esperado.estimativaMin);
  }
});

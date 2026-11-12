// Cadastro igual ao mock: força da senha com a face de cada nível e as mesmas mensagens de erro.
import assert from "node:assert/strict";
import { test } from "node:test";
import { erroDoCadastro, PW, pwScore } from "../../src/features/conta/regras.ts";

test("a força da senha segue a pontuação do mock", () => {
  assert.equal(pwScore(""), 0);
  assert.equal(pwScore("abcdefgh"), 1);
  assert.equal(pwScore("abcdefghijkl"), 2);
  assert.equal(pwScore("Abcdefghijkl1"), 4);
  assert.equal(pwScore("Abcdefghijkl1!"), 4);
  assert.deepEqual(PW.map(p => p[1]), ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"]);
});

test("o cadastro recusa com as mensagens do mock", () => {
  assert.equal(erroDoCadastro(" ", "a@b.co", "12345678", "12345678"), "Diga seu nome.");
  assert.equal(erroDoCadastro("Igor", "igor@", "12345678", "12345678"), "Esse e-mail não parece válido.");
  assert.equal(erroDoCadastro("Igor", "a@b.co", "1234567", "1234567"), "A senha precisa de pelo menos 8 caracteres.");
  assert.equal(erroDoCadastro("Igor", "a@b.co", "12345678", "12345679"), "As senhas não são iguais.");
  assert.equal(erroDoCadastro("Igor", "a@b.co", "12345678", "12345678"), "");
});

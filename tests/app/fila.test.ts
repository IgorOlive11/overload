// A fila de envio do aparelho: grava primeiro, envia depois, nunca perde item por falta de rede e avisa a pessoa.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ArmazemEmMemoria, Fila, SemSessao, type Envio, type Item } from "../../src/lib/fila.ts";

const sessao = (id: string, estado = "em_andamento"): Item => ({ tipo: "sessao", id, dados: { id, estado } });
const registro = (id: string, sessaoId: string): Item => ({ tipo: "registro", id, dados: { id, sessaoId } });

test("sem rede, a fila guarda tudo e avisa; quando a rede volta, envia e esvazia", async () => {
  let online = false;
  const enviados: object[] = [];
  const envio: Envio = async lote => {
    if (!online) throw new Error("Sem conexão.");
    enviados.push(lote);
    return { recusas: [] };
  };
  const f = new Fila(new ArmazemEmMemoria(), envio);
  await f.acrescentar(sessao("s1"), registro("r1", "s1"), registro("r2", "s1"));
  await f.enviar();
  assert.equal(f.atual.pendentes, 3);
  assert.equal(f.atual.falha, "Sem conexão.");
  online = true;
  await f.enviar();
  assert.equal(f.atual.pendentes, 0);
  assert.equal(f.atual.falha, null);
  assert.deepEqual(enviados, [{ sessoes: [{ id: "s1", estado: "em_andamento" }], registros: [{ id: "r1", sessaoId: "s1" }, { id: "r2", sessaoId: "s1" }] }]);
});

test("a sessão que termina substitui a mesma sessão ainda pendente", async () => {
  const lotes: { sessoes: object[] }[] = [];
  const f = new Fila(new ArmazemEmMemoria(), async l => { lotes.push(l); return { recusas: [] }; });
  await f.acrescentar(sessao("s1"));
  await f.acrescentar(sessao("s1", "encerrada"));
  await f.enviar();
  assert.deepEqual(lotes[0]!.sessoes, [{ id: "s1", estado: "encerrada" }]);
});

test("o que a API recusa sai da fila e vira aviso para a pessoa", async () => {
  const f = new Fila(new ArmazemEmMemoria(), async () => ({ recusas: [{ id: "r2", motivo: "violates check constraint" }] }));
  await f.acrescentar(sessao("s1"), registro("r1", "s1"), registro("r2", "s1"));
  await f.enviar();
  assert.equal(f.atual.pendentes, 0);
  assert.deepEqual(f.atual.recusas, [{ id: "r2", tipo: "registro", motivo: "violates check constraint" }]);
  f.dispensarRecusas();
  assert.deepEqual(f.atual.recusas, []);
});

test("sessão vencida não perde nada e pede para entrar de novo", async () => {
  const f = new Fila(new ArmazemEmMemoria(), async () => { throw new SemSessao(); });
  await f.acrescentar(registro("r1", "s0"));
  await f.enviar();
  assert.equal(f.atual.pendentes, 1);
  assert.equal(f.atual.semSessao, true);
});

test("duas chamadas ao mesmo tempo enviam uma vez só", async () => {
  let chamadas = 0;
  const f = new Fila(new ArmazemEmMemoria(), async () => { chamadas++; await new Promise(r => setTimeout(r, 10)); return { recusas: [] }; });
  await f.acrescentar(sessao("s1"));
  await Promise.all([f.enviar(), f.enviar()]);
  assert.equal(chamadas, 1);
});

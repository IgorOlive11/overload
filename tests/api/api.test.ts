// A API de ponta a ponta contra um Postgres de verdade (veja tests/db/apoio.ts), sem abrir porta.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { construirApp } from "../../server/app.ts";
import { criarPool } from "../../server/banco.ts";
import type { Config } from "../../server/config.ts";
import { bancoDeTeste, semBanco, type Banco } from "../db/apoio.ts";

const ORIGEM = "https://overload.test";
const cfg: Config = { porta: 0, urlBanco: "", origem: ORIGEM, producao: false, resendChave: undefined, remetente: "x", confiarProxy: false, pastaApp: undefined };

let banco: Banco;
let pool: pg.Pool;
let app: FastifyInstance;
let dono: pg.Client;

type Resp = Awaited<ReturnType<FastifyInstance["inject"]>>;
const cookieDe = (r: Resp) => {
  const c = r.cookies.find(x => x.name === "overload_sessao");
  return c ? `overload_sessao=${c.value}` : "";
};
const chamar = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object, cookie = "", extra: Record<string, string> = {}) =>
  app.inject({ method, url: `/api${url}`, payload, headers: { origin: ORIGEM, ...(cookie ? { cookie } : {}), ...extra } });

/* O link do último e-mail para o endereço. Só a dona lê a fila; a API não. */
async function ultimoLink(email: string): Promise<string> {
  const { rows } = await dono.query("select dados->>'link' as link from overload.tarefas_email where para = $1 order by id desc limit 1", [email]);
  return rows[0].link;
}
const tokenDo = (link: string) => link.split("#t=")[1]!;

async function contaConfirmada(nome = "Teste"): Promise<{ email: string; cookie: string }> {
  const email = `${randomUUID()}@exemplo.test`;
  await chamar("POST", "/conta", { nome, email, senha: "senha-forte-1" });
  const r = await chamar("POST", "/conta/confirmar", { token: tokenDo(await ultimoLink(email)) });
  return { email, cookie: cookieDe(r) };
}

const protocolo = (versao: number | null, agenda: "semana" | "sequencia" = "semana") => ({
  versao, agenda, descanso: 120, descansoPreparo: 40,
  camada: { fase: true, semanas: 8, meta: true, metaN: 3, nuncaDuas: true },
  dias: Array.from({ length: 7 }, (_, d) => ({
    folga: d % 2 === 1,
    exercicios: d % 2 === 1 ? [] : [{
      id: randomUUID(), bibliotecaId: null, nome: "Supino reto", musculo: "PEITO", equipamento: "barra", apelido: null,
      acessorios: ["TRÍCEPS", "OMBROS"], preparo: "auto", descanso: null, descansoPreparo: null,
      series: [{ tipo: "NORMAL", ger: 10, faixa: [8, 10] }, { tipo: "REST_PAUSE" }]
    }]
  }))
});

describe("API", { skip: semBanco }, () => {
  before(async () => {
    banco = await bancoDeTeste();
    pool = criarPool(banco.urlApi);
    app = await construirApp(pool, cfg);
    dono = new pg.Client({ connectionString: banco.urlDono });
    await dono.connect();
  });
  after(async () => {
    await app?.close();
    await pool?.end();
    await dono?.end();
    await banco?.fechar();
  });

  test("cadastro pede confirmação por e-mail antes de entrar", async () => {
    const email = `${randomUUID()}@exemplo.test`;
    assert.equal((await chamar("POST", "/conta", { nome: "Ana", email, senha: "senha-forte-1" })).statusCode, 202);
    const login = await chamar("POST", "/sessao", { email, senha: "senha-forte-1" });
    assert.equal(login.statusCode, 403);
    assert.equal(login.json().codigo, "email_nao_confirmado");
    const link = await ultimoLink(email);
    assert.ok(link.startsWith(`${ORIGEM}/confirmar#t=`));
    const ok = await chamar("POST", "/conta/confirmar", { token: tokenDo(link) });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().conta.nome, "Ana");
    const c = ok.cookies.find(x => x.name === "overload_sessao")!;
    assert.equal(c.httpOnly, true);
    assert.equal(c.sameSite, "Lax");
    assert.equal((await chamar("GET", "/conta", undefined, cookieDe(ok))).json().conta.email, email);
    // O link vale uma vez.
    assert.equal((await chamar("POST", "/conta/confirmar", { token: tokenDo(link) })).statusCode, 400);
  });

  test("cadastro com e-mail já usado responde igual e não cria outra conta", async () => {
    const { email } = await contaConfirmada();
    assert.equal((await chamar("POST", "/conta", { nome: "Outro", email, senha: "outra-senha-1" })).statusCode, 202);
    assert.equal((await dono.query("select count(*)::int n from overload.contas where email = $1", [email])).rows[0].n, 1);
  });

  test("login com senha errada ou e-mail desconhecido dá a mesma resposta", async () => {
    const { email } = await contaConfirmada();
    const errada = await chamar("POST", "/sessao", { email, senha: "nao-e-essa" });
    const ninguem = await chamar("POST", "/sessao", { email: `${randomUUID()}@exemplo.test`, senha: "nao-e-essa" });
    assert.equal(errada.statusCode, 401);
    assert.deepEqual(errada.json(), ninguem.json());
  });

  test("conta do v1 entra com a mesma senha (hash $2a$)", async () => {
    const email = `${randomUUID()}@exemplo.test`;
    const hash = bcrypt.hashSync("senha-do-v1", 10).replace(/^\$2b\$/, "$2a$");
    assert.ok(hash.startsWith("$2a$"));
    await dono.query("insert into overload.contas (email, nome, senha_hash, email_confirmado_em, origem) values ($1, 'Do v1', $2, now(), 'v1')", [email, hash]);
    const r = await chamar("POST", "/sessao", { email: email.toUpperCase(), senha: "senha-do-v1" });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().conta.nome, "Do v1");
  });

  test("redefinir a senha troca a senha e derruba as sessões antigas", async () => {
    const { email, cookie } = await contaConfirmada();
    assert.equal((await chamar("POST", "/conta/esqueci", { email })).statusCode, 202);
    const r = await chamar("POST", "/conta/redefinir", { token: tokenDo(await ultimoLink(email)), senha: "senha-nova-123" });
    assert.equal(r.statusCode, 200);
    assert.equal((await chamar("GET", "/conta", undefined, cookie)).statusCode, 401);
    assert.equal((await chamar("POST", "/sessao", { email, senha: "senha-forte-1" })).statusCode, 401);
    assert.equal((await chamar("POST", "/sessao", { email, senha: "senha-nova-123" })).statusCode, 200);
  });

  test("sair invalida o cookie", async () => {
    const { cookie } = await contaConfirmada();
    assert.equal((await chamar("DELETE", "/sessao", undefined, cookie)).statusCode, 204);
    assert.equal((await chamar("GET", "/conta", undefined, cookie)).statusCode, 401);
  });

  test("requisição de outra origem é recusada", async () => {
    const { cookie } = await contaConfirmada();
    const r = await chamar("PATCH", "/conta", { nome: "x" }, cookie, { origin: "https://malicioso.test" });
    assert.equal(r.statusCode, 403);
  });

  test("protocolo: grava, lê e recusa gravação com versão velha", async () => {
    const { cookie } = await contaConfirmada();
    assert.equal((await chamar("GET", "/protocolo", undefined, cookie)).json().protocolo, null);
    const p1 = await chamar("PUT", "/protocolo", protocolo(null), cookie);
    assert.equal(p1.statusCode, 200);
    const salvo = p1.json().protocolo;
    assert.equal(salvo.versao, 1);
    assert.deepEqual(salvo.dias[0].exercicios[0].acessorios, ["TRÍCEPS", "OMBROS"]);
    assert.deepEqual(salvo.dias[0].exercicios[0].series, [{ tipo: "NORMAL", ger: 10, faixa: [8, 10] }, { tipo: "REST_PAUSE" }]);
    assert.equal((await chamar("PUT", "/protocolo", protocolo(1), cookie)).json().protocolo.versao, 2);
    const velho = await chamar("PUT", "/protocolo", protocolo(1), cookie);
    assert.equal(velho.statusCode, 409);
    assert.equal(velho.json().protocolo.versao, 2);
  });

  test("protocolo com série fora das regras é recusado", async () => {
    const { cookie } = await contaConfirmada();
    const p = protocolo(null);
    p.dias[0]!.exercicios[0]!.series = [{ tipo: "NORMAL", ger: 14, faixa: [8, 10] }];
    assert.equal((await chamar("PUT", "/protocolo", p, cookie)).statusCode, 400);
    const q = protocolo(null);
    (q.dias[0]!.exercicios[0]!.series as object[]) = [{ tipo: "WIDOWMAKER" }];
    assert.equal((await chamar("PUT", "/protocolo", q, cookie)).statusCode, 400);
  });

  test("sem login, nada de dado: 401 em todas as rotas de conta", async () => {
    for (const [m, u] of [["GET", "/protocolo"], ["GET", "/sessoes"], ["GET", "/biblioteca"], ["POST", "/envio"]] as const) {
      assert.equal((await chamar(m, u, m === "POST" ? {} : undefined)).statusCode, 401, `${m} ${u}`);
    }
  });

  test("envio pela fila: reenviar o mesmo lote não duplica, e a segunda conta não vê nada", async () => {
    const a = await contaConfirmada();
    const b = await contaConfirmada();
    const p = (await chamar("PUT", "/protocolo", protocolo(null, "sequencia"), a.cookie)).json().protocolo;
    const ex = p.dias[0].exercicios[0];
    const sessao = { id: randomUUID(), protocoloId: p.id, protocoloVersao: 1, dia: 0, indiceTreino: 0, diaLocal: "2026-11-11", iniciadaEm: "2026-11-11T10:00:00Z", terminadaEm: "2026-11-11T11:00:00Z", estado: "encerrada" };
    const reg = (ordem: number, kg: number, reps: number) => ({
      id: randomUUID(), sessaoId: sessao.id, exercicioChave: "nome:SUPINO RETO", exercicioId: ex.id, configuracao: "N10:8-10|RP",
      passo: "valida", ordem, tipo: "NORMAL", kg, reps, ger: 10, feitoEm: "2026-11-11T10:20:00Z" });
    const lote = { sessoes: [sessao], registros: [reg(0, 60, 10), { ...reg(1, 60, 0), tipo: "REST_PAUSE", reps: null, ger: null, b1: 10, b2: 4 }] };
    assert.deepEqual((await chamar("POST", "/envio", lote, a.cookie)).json(), { recusas: [] });
    assert.deepEqual((await chamar("POST", "/envio", lote, a.cookie)).json(), { recusas: [] });
    assert.equal((await dono.query("select count(*)::int n from overload.registros_serie where sessao_id = $1", [sessao.id])).rows[0].n, 2);

    // "Encerrar aqui" conta presença e faz a fila da agenda por sequência andar uma vez só.
    assert.equal((await chamar("GET", "/sessoes", undefined, a.cookie)).json().sessoes.length, 1);
    assert.equal((await chamar("GET", "/protocolo", undefined, a.cookie)).json().protocolo.fila, 1);

    const ultimo = (await chamar("GET", `/historico/ultimo?chave=${encodeURIComponent("nome:SUPINO RETO")}&configuracao=${encodeURIComponent("N10:8-10|RP")}`, undefined, a.cookie)).json().ultimo;
    assert.equal(ultimo.registros.length, 2);
    assert.equal(ultimo.registros[0].kg, 60);

    // A segunda conta não lê nada da primeira e não consegue gravar na sessão dela.
    assert.deepEqual((await chamar("GET", "/sessoes", undefined, b.cookie)).json().sessoes, []);
    assert.equal((await chamar("GET", `/historico/ultimo?chave=${encodeURIComponent("nome:SUPINO RETO")}&configuracao=${encodeURIComponent("N10:8-10|RP")}`, undefined, b.cookie)).json().ultimo, null);
    const invasao = await chamar("POST", "/envio", { registros: [reg(2, 999, 1)] }, b.cookie);
    assert.equal(invasao.json().recusas.length, 1);
  });

  test("cancelar descarta: a sessão não conta presença e não entra no histórico", async () => {
    const a = await contaConfirmada();
    const s = { id: randomUUID(), dia: 0, indiceTreino: 0, diaLocal: "2026-11-11", iniciadaEm: "2026-11-11T10:00:00Z", terminadaEm: "2026-11-11T10:05:00Z", estado: "cancelada" };
    const r = { id: randomUUID(), sessaoId: s.id, exercicioChave: "x", configuracao: "N10:8-10", passo: "valida", ordem: 0, tipo: "NORMAL", kg: 50, reps: 9, feitoEm: "2026-11-11T10:01:00Z" };
    await chamar("POST", "/envio", { sessoes: [s], registros: [r] }, a.cookie);
    assert.deepEqual((await chamar("GET", "/sessoes", undefined, a.cookie)).json().sessoes, []);
    assert.equal((await chamar("GET", "/historico/ultimo?chave=x&configuracao=N10:8-10", undefined, a.cookie)).json().ultimo, null);
  });

  test("login tem limite de tentativas", async () => {
    const email = `${randomUUID()}@exemplo.test`;
    let ultimo = 0;
    for (let i = 0; i < 11; i++) ultimo = (await chamar("POST", "/sessao", { email, senha: "qualquer-1" }, "", { "x-forwarded-for": "10.9.9.9" })).statusCode;
    assert.equal(ultimo, 429);
  });
});

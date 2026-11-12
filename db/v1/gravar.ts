// Gravação no v2 do que db/v1/converter.ts converteu, como overload_dono, numa transação aberta por quem chama.
import type pg from "pg";
import { gravarProtocolo } from "../../server/protocolo.ts";
import type { ContaMigrada, ItemV2 } from "./converter.ts";

export async function gravarItens(c: pg.ClientBase, itens: readonly ItemV2[]) {
  for (const i of itens) {
    await c.query(`insert into overload.biblioteca (id, nome, nome_pt, gif_url, musculo, acessorios, equipamento, pilha_kg, partes, instrucoes, instrucoes_pt)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (id) do nothing`,
      [i.id, i.nome, i.nomePt, i.gifUrl, i.musculo, i.acessorios, i.equipamento, i.pilhaKg, i.partes, i.instrucoes, i.instrucoesPt]);
  }
}

export async function gravarConta(c: pg.ClientBase, m: ContaMigrada) {
  const k = m.conta;
  await c.query(`insert into overload.contas (id, email, nome, senha_hash, email_confirmado_em, origem, criada_em) values ($1,$2,$3,$4,$5,'v1',$6)`,
    [k.id, k.email, k.nome, k.senhaHash, k.confirmadoEm, k.criadaEm]);
  await c.query("select set_config('overload.conta_id', $1, true)", [k.id]);
  await gravarItens(c, m.novosItens);
  if (m.protocolo) await gravarProtocolo(c as pg.PoolClient, m.protocolo);
  for (const s of m.sessoes) {
    await c.query(`insert into overload.sessoes_treino (id, dia, indice_treino, dia_local, iniciada_em, terminada_em, estado)
                   values ($1,$2,$3,$4,$5,$6,'concluida')`, [s.id, s.dia, s.indiceTreino, s.diaLocal, s.iniciadaEm, s.terminadaEm]);
  }
  for (const r of m.registros) {
    await c.query(`insert into overload.registros_serie (id, sessao_id, exercicio_chave, configuracao, passo, ordem, tipo, kg, reps, ger, b1, b2, blocos, ultimo, feito_em)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [r.id, r.sessaoId, r.exercicioChave, r.configuracao, r.passo, r.ordem, r.tipo, r.kg, r.reps, r.ger, r.b1, r.b2, r.blocos, r.ultimo, r.feitoEm]);
  }
}

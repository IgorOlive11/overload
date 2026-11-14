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

export interface Destino { contaId: string; nova: boolean; temProtocolo: boolean }

/* Onde a conta do v1 entra: a conta já migrada (mesmo id), a conta criada no v2 com o mesmo e-mail, ou uma conta nova. */
export async function destinoDaConta(c: pg.ClientBase, m: ContaMigrada): Promise<Destino> {
  const r = (await c.query("select id from overload.contas where id = $1 or email = $2 order by (id = $1) desc limit 1", [m.conta.id, m.conta.email])).rows[0];
  if (!r) return { contaId: m.conta.id, nova: true, temProtocolo: false };
  // O dono é dono das tabelas e não passa pela RLS: o filtro por conta é explícito.
  const p = (await c.query("select 1 from overload.protocolos where conta_id = $1 and ativo", [r.id])).rowCount;
  return { contaId: r.id, nova: false, temProtocolo: !!p };
}

/* Grava a conta. Conta que já existe no v2 fica com a senha e o nome de lá; o protocolo do v1 só entra se ela não tiver um.
   Sessões e registros têm id estável e "on conflict do nothing": rodar de novo só acrescenta o que é novo no v1. */
export async function gravarConta(c: pg.ClientBase, m: ContaMigrada): Promise<{ destino: Destino; sessoes: number; registros: number }> {
  const k = m.conta, destino = await destinoDaConta(c, m);
  if (destino.nova) {
    await c.query(`insert into overload.contas (id, email, nome, senha_hash, email_confirmado_em, origem, criada_em) values ($1,$2,$3,$4,$5,'v1',$6)`,
      [k.id, k.email, k.nome, k.senhaHash, k.confirmadoEm, k.criadaEm]);
  }
  await c.query("select set_config('overload.conta_id', $1, true)", [destino.contaId]);
  await gravarItens(c, m.novosItens);
  if (m.protocolo && !destino.temProtocolo) await gravarProtocolo(c as pg.PoolClient, m.protocolo);
  let sessoes = 0, registros = 0;
  for (const s of m.sessoes) {
    sessoes += (await c.query(`insert into overload.sessoes_treino (id, dia, indice_treino, dia_local, iniciada_em, terminada_em, estado)
                   values ($1,$2,$3,$4,$5,$6,'concluida') on conflict (id) do nothing`, [s.id, s.dia, s.indiceTreino, s.diaLocal, s.iniciadaEm, s.terminadaEm])).rowCount ?? 0;
  }
  for (const r of m.registros) {
    registros += (await c.query(`insert into overload.registros_serie (id, sessao_id, exercicio_chave, configuracao, passo, ordem, tipo, kg, reps, ger, b1, b2, blocos, ultimo, feito_em)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) on conflict (id) do nothing`,
      [r.id, r.sessaoId, r.exercicioChave, r.configuracao, r.passo, r.ordem, r.tipo, r.kg, r.reps, r.ger, r.b1, r.b2, r.blocos, r.ultimo, r.feitoEm])).rowCount ?? 0;
  }
  return { destino, sessoes, registros };
}

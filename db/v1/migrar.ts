// Migração do v1 (Supabase "ultima-wepon") para o v2: biblioteca, contas com a mesma senha, protocolo e histórico.
// Uso:
//   DATABASE_URL_V1=postgres://...supabase...  DATABASE_URL_MIGRACAO=postgres://overload_dono:...@host/db  node db/v1/migrar.ts
//   O padrão só lê e mostra o relatório. Com --aplicar, grava no v2.
// O v1 só é lido. No v2, uma conta que já existe (pelo id ou pelo e-mail) é pulada: rodar de novo não duplica nada.
// O relatório não mostra e-mail nem nome: cada conta aparece pelo começo do id.
import pg from "pg";
import { itemDaBiblioteca, migrarConta, type ItemV1 } from "./converter.ts";
import { gravarConta, gravarItens } from "./gravar.ts";

pg.types.setTypeParser(pg.types.builtins.NUMERIC, v => Number(v));

const aplicar = process.argv.includes("--aplicar");
const urlV1 = process.env.DATABASE_URL_V1, urlV2 = process.env.DATABASE_URL_MIGRACAO;
if (!urlV1 || !urlV2) throw new Error("Defina DATABASE_URL_V1 (Supabase do v1) e DATABASE_URL_MIGRACAO (overload_dono do v2).");

const v1 = new pg.Client({ connectionString: urlV1, ssl: urlV1.includes("supabase") ? { rejectUnauthorized: false } : undefined });
const v2 = new pg.Client({ connectionString: urlV2 });
await v1.connect(); await v2.connect();

try {
  // Biblioteca inteira, com o equipamento em categoria automática (decisão do PO em 12/11).
  const itensV1 = (await v1.query<ItemV1>(`select id, name, name_pt, gif_url, target_muscles, secondary_muscles, equipments, body_parts,
    instructions, instructions_pt from public.exercises_library order by id`)).rows;
  const biblioteca = new Map(itensV1.map(i => [i.id, itemDaBiblioteca(i)]));
  const porEquipamento: Record<string, number> = {};
  for (const i of biblioteca.values()) porEquipamento[i.equipamento] = (porEquipamento[i.equipamento] ?? 0) + 1;
  console.log(`Biblioteca: ${biblioteca.size} itens (${Object.entries(porEquipamento).map(([e, n]) => `${e} ${n}`).join(", ")}).`);
  // O que já está no v2 (os exercícios do mock) também liga por nome.
  for (const r of (await v2.query("select id, nome, nome_pt as \"nomePt\", musculo, acessorios, equipamento from overload.biblioteca")).rows)
    if (!biblioteca.has(r.id)) biblioteca.set(r.id, { ...r, gifUrl: null, pilhaKg: null, partes: [], instrucoes: [], instrucoesPt: null });

  const contas = (await v1.query(`select u.id, u.email, p.name as nome, u.encrypted_password as "senhaHash", u.email_confirmed_at as "confirmadoEm",
      u.created_at as "criadaEm", coalesce((select jsonb_object_agg(d.section, d.data) from public.user_data d where d.user_id = u.id), '{}') as secoes
    from auth.users u left join public.profiles p on p.id = u.id where u.email is not null order by u.created_at`)).rows;

  if (aplicar) { await v2.query("begin"); await gravarItens(v2, itensV1.map(itemDaBiblioteca)); await v2.query("commit"); }

  let migradas = 0, puladas = 0;
  for (const c of contas) {
    const rotulo = String(c.id).slice(0, 8);
    if (!/^\$2[aby]\$\d\d\$.{53}$/.test(c.senhaHash ?? "")) { console.log(`${rotulo}: pulada, senha fora do formato bcrypt.`); puladas++; continue; }
    const existe = (await v2.query("select 1 from overload.contas where id = $1 or email = lower(btrim($2))", [c.id, c.email])).rowCount;
    if (existe) { console.log(`${rotulo}: pulada, já existe no v2.`); puladas++; continue; }
    const m = migrarConta({ ...c, criadaEm: new Date(c.criadaEm).toISOString(), confirmadoEm: c.confirmadoEm ? new Date(c.confirmadoEm).toISOString() : null }, biblioteca);
    const treinos = m.protocolo ? m.protocolo.dias.filter(d => !d.folga).length : 0;
    console.log(`${rotulo}: ${m.protocolo ? `protocolo com ${treinos} treino(s)` : "sem protocolo"}, ${m.sessoes.length} sessão(ões), ${m.registros.length} registro(s).`);
    for (const a of m.avisos) console.log(`  - ${a}`);
    if (!aplicar) continue;
    await v2.query("begin");
    try { await gravarConta(v2, m); await v2.query("commit"); migradas++; }
    catch (e) { await v2.query("rollback"); console.log(`  ! não gravada: ${(e as Error).message}`); }
  }
  console.log(aplicar ? `Pronto: ${migradas} conta(s) migrada(s), ${puladas} pulada(s).` : "Só leitura. Rode com --aplicar para gravar no v2.");
} finally {
  await v1.end(); await v2.end();
}

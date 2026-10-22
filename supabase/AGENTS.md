# Regras do banco

Estas regras valem para tudo dentro de `supabase/` e se somam ao `AGENTS.md` da raiz.

## Comandos

- `supabase start`: sobe o banco local.
- `supabase migration new <nome>`: cria uma migração nova.
- `supabase test db`: roda os testes de `supabase/tests` com pgTAP contra o banco local.

## Sempre

- Toda tabela nova nasce com RLS ligado e com política de "só o dono": cada conta lê e grava apenas as próprias linhas.
- Toda tabela nova vem com um teste em `supabase/tests` que prova que uma segunda conta não lê, não altera e não apaga as linhas da primeira.
- Uma migração por mudança, com nome que diga o que ela faz.

## Nunca

- Nunca edite uma migração que já foi aplicada. Corrija com uma migração nova.
- Nunca tire a decisão de permissão de `raw_user_meta_data` nem de `user_metadata`.
- Nunca use `SECURITY DEFINER` sem fixar o `search_path` e sem explicar o motivo no pull request.
- Nunca aplique migração no projeto de produção. Isso é feito pelo dono do repositório depois do merge.
- Nunca coloque a chave de serviço em Edge Function que responde ao app sem conferir quem está chamando.

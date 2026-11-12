---
name: nova-tabela
description: Use sempre que uma tarefa do Overload criar ou alterar uma tabela, uma política de acesso ou uma função no banco (db/).
---

# Nova tabela

1. Leia o `db/AGENTS.md` antes de começar.
2. Crie a migração em `db/migrations/NNNN_o_que_faz.sql`, com o próximo número. Nunca edite uma migração que já existe.
3. Na mesma migração:
   - crie a tabela no schema `overload`, com `conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade`;
   - ligue o RLS com `alter table ... enable row level security`;
   - crie a política `so_o_dono` com `using (conta_id = overload.conta_atual()) with check (conta_id = overload.conta_atual())`;
   - dê a `overload_api` só os privilégios que a API usa;
   - nas chaves estrangeiras para outra tabela de conta, leve `conta_id` junto.
4. Acrescente a tabela em `tests/db/isolamento.test.ts`, cobrindo:
   - a conta dona lê, insere, altera e apaga a própria linha (o que os privilégios permitirem);
   - uma segunda conta não lê, não altera e não apaga a linha da primeira;
   - sem conta, nada aparece.
5. Rode `npm test` com `DATABASE_URL_TESTE` apontando para um Postgres descartável e confirme que tudo passa.
6. Confirme que o teste falha se a política for removida. Se ele continuar passando sem a política, ele não está testando nada.
7. No pull request, explique em português o que a migração muda e quem passa a poder ler ou gravar o quê.

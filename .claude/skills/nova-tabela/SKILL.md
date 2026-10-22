---
name: nova-tabela
description: Use sempre que uma tarefa do Overload criar ou alterar uma tabela, uma política de acesso ou uma função no banco do Supabase.
---

# Nova tabela

1. Leia o `supabase/AGENTS.md` antes de começar.
2. Crie a migração com `supabase migration new <o-que-ela-faz>`. Nunca edite uma migração que já existe.
3. Na mesma migração:
   - crie a tabela com a coluna do dono ligada a `auth.users`;
   - ligue o RLS com `alter table ... enable row level security`;
   - crie as políticas de leitura, inserção, alteração e exclusão, todas comparando a coluna do dono com `auth.uid()`.
4. Crie o teste em `supabase/tests/<tabela>.test.sql`, com pgTAP, cobrindo:
   - a conta dona lê, insere, altera e apaga a própria linha;
   - uma segunda conta não lê, não altera e não apaga a linha da primeira;
   - uma chamada sem login não lê nada.
5. Rode `supabase test db` e confirme que tudo passa.
6. Confirme que o teste falha se a política for removida. Se ele continuar passando sem a política, ele não está testando nada.
7. No pull request, explique em português o que a migração muda e quem passa a poder ler ou gravar o quê.

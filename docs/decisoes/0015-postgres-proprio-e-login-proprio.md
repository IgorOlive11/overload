# Postgres próprio na Oracle A1, com login próprio e schema `overload`, no lugar do Supabase

- Status: proposta. Quando aceita, substitui a [0012](0012-mesmo-projeto-supabase-do-v1.md) e a [0014](0014-convivencia-do-esquema-v2-com-o-v1.md).
- Data: 2026-11-11
- Quem decidiu: pendente. A stack foi confirmada pelo PO no chat em 11/11 (Doc "Overload v2: plano do MVP"); falta o aceite do registro na issue.

## Contexto e problema

A 0012 colocou o v2 no mesmo projeto Supabase do v1, e a 0014 propôs um schema `overload` ao lado do `public` do v1. Em 11/11 o PO trocou a stack do MVP: React e Vite no app, Node 24 com Fastify e `pg` na API, Postgres próprio, tudo pelo Coolify no servidor `oracle-a1` (Oracle A1, ARM). O login passa a ser próprio, sem Supabase Auth. O MVP precisa funcionar sem internet na academia, então a fila de envio vive no aparelho.

Sem o Supabase, deixam de existir `auth.users`, `auth.uid()`, a API REST gerada e as Edge Functions. A convivência no mesmo banco, que era o problema da 0014, deixa de existir: o v1 continua no Supabase até a troca, e o v2 nasce num banco separado.

## O que pesou na decisão

- Cada pessoa do v1 precisa entrar com a mesma senha. O Supabase Auth guarda bcrypt (`$2a$`), que o `bcryptjs` confere.
- A regra "só o dono" continua valendo no banco, não só no código da API (decisão de arquitetura e lição do v1).
- O v2 não tem papel (0009) e não confia em nada que o cliente manda para decidir acesso.
- O MVP tem prazo curto e uma pessoa testando. Menos peças móveis vencem.
- A A1 é grátis e sem SLA. O banco precisa de backup fora dela.

## Opções consideradas

1. **Postgres próprio no Coolify da A1, login próprio na API, schema `overload`.**
2. Manter o Supabase (0012 e 0014) e trocar só o app. Descartada pelo PO em 11/11.
3. Postgres próprio com um serviço de autenticação pronto (Keycloak, Authentik). Mais uma peça para operar na A1, e a importação dos hashes do v1 fica mais difícil.

## Decisão

A opção 1.

**Banco.** Postgres 16 num container do Coolify no `oracle-a1`, sem porta pública. A API fala com ele pela rede interna. Tudo do v2 fica no schema `overload`. As migrações são arquivos SQL em `db/migrations`, aplicados em ordem por um executor próprio, que registra cada uma em `overload.migracoes`. Migração aplicada nunca é editada.

**Acesso.** Duas funções no banco:

- `overload_dono`: dona do schema e das tabelas, usada só para migrar;
- `overload_api`: a API, sem `BYPASSRLS` e sem ser dona de nada, com privilégios só nas tabelas que usa.

Toda tabela com dados de uma conta tem RLS ligado e forçado, com a política "só o dono" comparando a coluna `conta_id` com `overload.conta_atual()`, que lê `current_setting('overload.conta_id', true)`. A API abre uma transação por requisição autenticada e grava esse valor com `set_config(..., true)`, que vale só dentro da transação. Sem o valor, nenhuma linha aparece. Assim, um erro de `where` na API não vaza dado de outra conta.

**Login.** A API cuida de cadastro, confirmação de e-mail, login, saída e redefinição de senha. A senha é guardada com bcrypt (`bcryptjs`, custo 12), e os hashes `$2a$` do v1 entram sem mudança. A sessão é um cookie `HttpOnly`, `Secure`, `SameSite=Lax`, com um token aleatório de 32 bytes; o banco guarda só o SHA-256 do token. O login tem limite de tentativas. Nada que o cliente envia no cadastro vira permissão.

**Mesma origem.** O app fica em `overload.app.br` e a API em `overload.app.br/api`, roteada pelo proxy do Coolify. Sem CORS, e o cookie é primário.

**E-mail.** Pelo Resend, a partir de uma tabela de tarefas no Postgres que a API processa. A chave do Resend fica só nas variáveis do Coolify.

**Biblioteca.** `overload.biblioteca` no banco novo, com o mesmo `id` de texto da `public.exercises_library` do v1, para o histórico migrado continuar ligado. Todo mundo lê; ninguém grava pela API. O cadastro é feito por script com acesso direto ao banco.

**Backup.** Diário, do Postgres da A1 para a QNAX.

## Consequências

- Bom, porque o v2 não divide nada com o v1. O risco do gatilho `handle_new_user` (0014) não atinge o v2.
- Bom, porque a regra "só o dono" continua no banco, e um teste prova que uma segunda conta não lê nem altera as linhas da primeira.
- Bom, porque as contas do v1 entram com a mesma senha, desde que todos os hashes estejam em bcrypt. A conferir no bloco 1, por uma contagem do prefixo dos hashes em produção.
- Ruim, porque login, confirmação e recuperação de senha passam a ser código nosso, com os riscos de segurança que isso traz. A revisão olha esse código com mais cuidado.
- Ruim, porque a A1 pode ser recolhida pela Oracle. O plano de volta é o backup na QNAX e subir tudo lá pelo Coolify.
- Ruim, porque os GIFs da biblioteca estão no bucket `exercises` do Supabase. Na migração (bloco 3) eles precisam de outra casa antes de o Supabase sair.
- Ruim, porque o `supabase/`, a skill `nova-tabela` e o `.env.example` falam de Supabase e precisam ser trocados.

## Como conferir

- `db/migrations` só cria objetos no schema `overload`.
- `npm run test:db` passa, com um teste de isolamento por tabela: o dono lê e grava, uma segunda conta não lê nem altera, e sem conta nada aparece.
- `overload_api` não é dona de nenhuma tabela e não tem `BYPASSRLS` (`select rolbypassrls from pg_roles where rolname = 'overload_api'`).
- Nenhum código do app importa `@supabase/supabase-js`.
- O Postgres no Coolify não publica porta.

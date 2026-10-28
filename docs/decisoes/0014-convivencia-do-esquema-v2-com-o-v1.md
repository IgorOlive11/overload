# Schema próprio `overload` para o v2, ao lado do `public` do v1, no mesmo banco

- Status: proposta
- Data: 2026-10-28
- Quem decidiu: pendente. Falta o PO aceitar na #38. No comentário que aprovou o plano da spike, o PO respondeu que o schema se chama `overload`, que o v2 lê `public.exercises_library` até a Fase 3 e só depois ganha cópia própria, e que o registro entra como proposta.

## Contexto e problema

O v2 usa o mesmo projeto Supabase do v1 em produção ([0012](0012-mesmo-projeto-supabase-do-v1.md)), e o v1 continua no ar, sem correções, até o desligamento na Fase 3 ([0008](0008-v1-como-legado-sem-correcoes.md), épico #20). As contas (`auth.users`) e a biblioteca de exercícios são compartilhadas. O v2 não tem papel de usuário ([0009](0009-sem-papel-de-administrador.md)).

A pergunta é como as tabelas, as políticas e os gatilhos do v2 convivem com os do v1 sem que um quebre o outro. A estrutura do v1 está em `docs/tecnico/legado/esquema-v1.sql`. Pontos dela que pesam aqui:

- tudo está no schema `public`, e `anon` e `authenticated` têm todos os privilégios em todas as tabelas dele (quem limita é a RLS);
- `public.profiles` tem `role` e `trainer_id`;
- o gatilho `on_auth_user_created` (função `public.handle_new_user`, `security definer`) dispara em todo insert em `auth.users` e grava `role` lido de `raw_user_meta_data`;
- as políticas de `exercises_library` e as do bucket `exercises` deixam escrever quem tem `role = 'admin'` em `public.profiles`.

## O que pesou na decisão

- O v1 não recebe correções (0008). Qualquer solução que dependa de mexer em objeto do v1 vai contra essa decisão.
- Nenhuma política do v2 pode depender de papel (0009) nem de `user_metadata` (`AGENTS.md`).
- Na Fase 3 o v1 sai. Quanto menos o v2 se misturar com ele, menos há para desfazer.
- Migrações novas não podem alterar nem recriar nada do `public` do v1 em produção, que já foi alterado pelo painel e não bate com as migrações antigas.
- O banco de desenvolvimento é outro projeto (#30), sem os objetos do v1.

## Opções consideradas

### Separação

1. **Schema próprio `overload`.** Tabelas, funções e políticas do v2 ficam nele.
   - Exige: expor o schema na API (config `[api] schemas` no `supabase/config.toml` local e "Exposed schemas" no painel em produção, que o dono configura); `grant usage on schema overload` e privilégios por tabela só para `authenticated`; no cliente, `createClient(..., { db: { schema: 'overload' } })` e `supabase.schema('public')` nas leituras da biblioteca; migrações que sempre qualificam o nome (`overload.sessions`).
   - Bom: nomes, políticas e funções não colidem com os do v1 (o v1 tem políticas duplicadas com os mesmos nomes, como `admin all`, e funções como `is_admin`). A Fase 3 vira apagar objetos do `public` sem tocar no v2. Dá para começar sem nenhum privilégio para `anon`, ao contrário do `public`.
   - Ruim: configuração a mais no painel de produção e no local; o schema novo não é exposto por padrão; quem esquecer o `grant` vê tabela "inexistente" na API.
2. **Tabelas novas no `public`, com outros nomes.**
   - Exige só migrações, sem expor nada.
   - Ruim: herda os privilégios e os privilégios padrão do `public` (`ALL` para `anon` e `authenticated`); convive com `profiles`, `is_admin` e outros nomes do v1, e o v2 teria de fugir deles (`profiles` já existe, e o rascunho de arquitetura chama a tabela do v2 de `profiles`); na Fase 3 é preciso separar à mão o que é de quem.
3. **Projeto novo.** Já descartada pelo 0012.

### Perfil

1. **O v2 cria o próprio perfil em `overload.profiles`**, com `id uuid primary key references auth.users (id) on delete cascade` e só o nome de exibição. Sem `role`, sem `trainer_id`. Não reaproveita `public.profiles`.
2. Reaproveitar `public.profiles`. Descartada: ela carrega `role` e `trainer_id`, que o v2 descartou, e as políticas dela dependem de papel.

### Gatilho `handle_new_user`

O `on_auth_user_created` dispara em qualquer conta nova, inclusive as criadas pelo v2, porque o gatilho está em `auth.users`, que é compartilhada. Para o v2 não depender dele nem herdar o comportamento:

1. **O app cria o perfil no primeiro acesso**, com `insert ... on conflict (id) do nothing` em `overload.profiles`, sob a política "só o dono" (`id = auth.uid()`). Sem gatilho novo, sem `security definer`, e o mesmo caminho serve para contas que vieram do v1 e ainda não migraram.
2. Um gatilho próprio do v2 em `auth.users` que cria `overload.profiles`. Exige `security definer` com `search_path` fixo e mais um gatilho em tabela do Auth, que é compartilhada com o v1. Funciona sem passo do app, mas aumenta o que precisa ser removido e testado.
3. Alterar ou remover o gatilho do v1 agora. Descartada: é correção no v1 (0008).

Em qualquer das três, o gatilho do v1 continua rodando e cria uma linha em `public.profiles` para a conta nova.

### Desligamento (Fase 3)

| Item do v1 | Na Fase 3 | Observação |
| --- | --- | --- |
| `auth.users` e o Auth | Fica | Compartilhado. O v2 depende. |
| Hook de e-mail do Auth (`send-email`) | Fica até o v2 ter o dele | O Auth tem um hook só por projeto, e o v2 aproveita o e-mail do Auth (0003). |
| `public.exercises_library` | Fica até o v2 ter a cópia própria | Ver "Biblioteca" abaixo. |
| Bucket `exercises` | Fica | Os `gif_url` apontam para ele. A cópia da tabela não copia os arquivos. |
| `public.profiles`, `user_data`, `workout_logs`, `exercise_history`, `saved_exercises`, `meal_logs`, `micro_logs` | Sai, depois de arquivada e migrada | Meal e micro logs: a dieta saiu do produto ([0010](0010-dieta-fora-do-produto.md)); arquivar antes de apagar, pelo relatório de cada pessoa. |
| `get_my_role`, `is_admin`, `is_my_student` | Sai | Só as políticas do v1 usam. |
| Gatilho `on_auth_user_created` e `handle_new_user` | Sai, depois de conferir que nada do v2 depende | Remover o gatilho primeiro, depois a função. |
| Políticas admin de `exercises_library` e de `storage.objects` | Sai antes de apagar `public.profiles` | Elas referenciam `profiles`. `drop table` sem `cascade` falha, e com `cascade` apaga as políticas sem avisar. O script de cadastro usa a chave de serviço e não precisa delas. |
| Edge Functions `get-student-data`, `save-student-data`, `send-feedback`, `schedule-rest-push` | Sai | Ver 0003. |

## Decisão

**Separação: opção 1.** O v2 usa o schema `overload`. Nada do v2 é criado, alterado ou apagado no `public`. As migrações do v2 só tocam `overload` (mais o que o `grant` exige). O cliente do app usa `overload` como schema padrão e lê a biblioteca com `.schema('public')`.

**Perfil: opção 1.** `overload.profiles` guarda só o nome de exibição e liga ao mesmo `auth.users`. As contas existentes ganham o perfil pelo script de migração do #20, copiando só o `name`.

**Gatilho: opção 1.** O app cria o perfil no primeiro acesso. O v2 não cria gatilho em `auth.users`, e o gatilho do v1 fica como está até a Fase 3 (0008). O cadastro do v2 nunca envia `role` (nem outro campo de permissão) em `options.data`, e nada do v2 lê `user_metadata` para decidir acesso.

**Biblioteca.** O v2 lê `public.exercises_library` e o bucket `exercises` até a Fase 3. Só depois ganha `overload.exercises_library` própria, com a cópia feita antes de apagar o `public`.

**Desligamento.** Segue a tabela acima. A ordem é: arquivar e migrar os dados; criar a cópia da biblioteca; remover políticas que referenciam `profiles`; remover o gatilho e a função; apagar as tabelas e funções do v1; desligar as Edge Functions.

## Consequências

Separação:

- Bom, porque a Fase 3 não toca em objeto do v2.
- Bom, porque as tabelas do v2 nascem sem privilégio para `anon`.
- Ruim, porque produção precisa de um passo manual do dono: expor `overload` na API. Sem ele, o app não enxerga as tabelas. Cabe ao dono, depois do merge (`supabase/AGENTS.md`).
- Ruim, porque as duas versões usam o mesmo histórico de migrações do Supabase. O `public` de produção foi alterado pelo painel e não bate com as migrações antigas, então o primeiro `db push` pode reclamar do histórico. A conferir antes do primeiro push (a spike não rodou isso).
- Ruim, porque o banco de desenvolvimento (#30) não tem `public.exercises_library`. O v2 precisa de uma tabela de apoio com esse nome, só em desenvolvimento e em teste, que não pode ir para produção como migração (lá ela já existe).

Perfil:

- Bom, porque o v2 não carrega `role` nem `trainer_id`.
- Ruim, porque a conta passa a ter dois perfis enquanto o v1 estiver no ar: `public.profiles` (do v1, sem uso no v2) e `overload.profiles`. O nome pode divergir entre eles; o v1 não é atualizado pelo v2.
- Ruim, porque excluir a conta no v2 (`excluir-conta`) apaga `auth.users` e, por `on delete cascade`, também os dados do v1 da mesma pessoa. Isso é desejado, mas vale avisar enquanto o v1 estiver no ar.

Gatilho e o risco do `handle_new_user`:

- Toda conta criada pelo v2 também ganha uma linha em `public.profiles`, que o v2 ignora. As políticas do v2 não consultam essa tabela.
- **Risco que continua aberto até a Fase 3 (0008):** o gatilho copia `raw_user_meta_data ->> 'role'`. Qualquer pessoa pode chamar o cadastro do Supabase direto, com a chave pública, enviando `data: { role: 'admin' }`, e nasce um `public.profiles` com `role = 'admin'`. Isso não é novo, e o v2 não o piora, mas vale mais do que o rascunho de arquitetura sugere, por dois motivos:
  - Esse admin pode escrever em `public.exercises_library` e no bucket `exercises`, **que o v2 lê até a Fase 3**. Quem fizer isso pode trocar nome, instruções e `gif_url` que o app mostra. O v2 deve tratar a biblioteca como dado não confiável: renderizar como texto, nunca como HTML, e aceitar `gif_url` só do host do bucket `exercises`.
  - Esse admin também lê e grava os dados do v1 de todo mundo (`is_admin()`), o que afeta quem ainda usa o v1 e quem foi migrado, enquanto o v1 estiver no ar com dados.
- O risco de `admin_all_profiles` e de `own_profile` (editar o próprio papel) é o mesmo e também só se fecha na Fase 3.
- O passo 2 do rascunho de arquitetura (listar contas com papel diferente de aluno) continua útil como conferência, mas não impede novos casos. Fica para o dono decidir se roda antes da migração dos dados (#20).
- Ruim, porque o app só cria o perfil no primeiro acesso: se a criação falhar, a tela de perfil precisa tratar a ausência da linha, e a leitura não pode supor que ela existe.

Biblioteca:

- Bom, porque o v2 começa sem copiar nada.
- Ruim, porque, até a Fase 3, a biblioteca do v2 depende de uma tabela com escrita aberta a `role = 'admin'` do v1 (acima).
- Ruim, porque na Fase 3 há uma troca de fonte (de `public` para `overload`) e a cópia de tabela e de arquivos do bucket, ou a manutenção do bucket compartilhado. O identificador estável dos exercícios (`id`) precisa ser preservado, porque o histórico migrado se liga a ele.

Desligamento:

- Bom, porque a lista do que sai e do que fica fica escrita antes do #20.
- Ruim, porque "o v1 fica só leitura para cada pessoa após a migração" (passo 6 do rascunho) não é possível sem mudar política ou privilégio do v1. Isso é correção no v1 (0008) e precisa de decisão do dono no #20; sem ela, o v1 segue gravável.

## O que isto exige das tarefas

Épico #11 (tabelas e acesso do v2):

- A primeira migração cria `schema overload` e os `grant` (`usage` no schema; privilégios por tabela só para `authenticated`; sem `anon`). Toda migração seguinte qualifica `overload.` e não toca `public`.
- Toda tabela segue a skill `nova-tabela`: RLS, política "só o dono", teste pgTAP com uma segunda conta e uma chamada sem login. A exceção da biblioteca é só leitura, e ela não fica no `overload` até a Fase 3.
- `overload.profiles`: `id` ligado a `auth.users` com `on delete cascade`, só o nome; política `id = auth.uid()` para ler, inserir e alterar; sem gatilho e sem `security definer`.
- Nenhuma política, função ou gatilho do v2 lê `public.profiles`, `user_metadata` ou `raw_user_meta_data`. Um teste procura isso nas definições do `overload`.
- `supabase/config.toml` lista `overload` em `[api] schemas`. O desenvolvimento (#30) precisa da tabela de apoio `public.exercises_library`, fora das migrações.
- O cliente do app usa `overload` como schema padrão, lê a biblioteca por `.schema('public')`, e o cadastro não envia `role`. Há um teste de que o cadastro do v2 não manda campo de permissão.

Épico #20 (migração e desligamento):

- Criar `overload.profiles` das contas existentes copiando só `name`; contas sem migrar ganham o perfil no primeiro acesso.
- Decidir com o dono se roda a listagem de contas com papel diferente de aluno antes de migrar, e se o v1 vira só leitura (o que muda o v1).
- Seguir a ordem da seção "Desligamento": arquivar, copiar a biblioteca e o bucket, remover políticas que referenciam `profiles`, o gatilho e a função, depois as tabelas e as Edge Functions. Manter `send-email` até o v2 ter o hook dele.
- Avisar que excluir a conta no v2 apaga também os dados do v1.

Épico #21 (script de cadastro de exercícios): grava na biblioteca com a chave de serviço, que ignora a RLS, e não depende das políticas admin do v1. Na Fase 3 passa a gravar em `overload.exercises_library`.

## Como conferir

- `supabase/migrations` só cria e altera objetos de `overload` (procurar por `public.` nas migrações do v2 deve achar só leitura/`grant` esperado).
- `supabase test db` passa, com teste de "só o dono" por tabela do `overload`.
- Nenhuma definição de política, função ou gatilho do `overload` cita `profiles` do `public`, `user_metadata` ou `raw_user_meta_data`.
- Em produção, o schema `overload` aparece nos schemas expostos e `anon` não tem privilégio nele.
- Na Fase 3, a lista de remoção segue a tabela acima, e o v2 continua funcionando depois dela.

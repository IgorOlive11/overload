-- Contas, sessões de login, tokens de e-mail e a fila de e-mails.
-- A API (overload_api) só vê as linhas da conta gravada em overload.conta_id, dentro da transação da requisição.
-- Onde a conta ainda não é conhecida (login, cookie, link do e-mail), a API passa por funções estreitas da dona.

create function overload.conta_atual() returns uuid
  language sql stable
  set search_path = pg_catalog
  as $$ select nullif(current_setting('overload.conta_id', true), '')::uuid $$;
grant execute on function overload.conta_atual() to overload_api;

create table overload.contas (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  nome text not null check (length(btrim(nome)) between 1 and 60),
  senha_hash text not null check (senha_hash ~ '^\$2[aby]\$\d\d\$.{53}$'),
  email_confirmado_em timestamptz,
  origem text not null default 'v2' check (origem in ('v1', 'v2')),
  criada_em timestamptz not null default now()
);
create unique index contas_email on overload.contas (email);

alter table overload.contas enable row level security;
create policy so_o_dono on overload.contas
  using (id = overload.conta_atual()) with check (id = overload.conta_atual());
grant select, update (nome, senha_hash) on overload.contas to overload_api;

create table overload.sessoes_login (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  token_hash bytea not null unique check (length(token_hash) = 32),
  criada_em timestamptz not null default now(),
  ultimo_uso_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '60 days',
  aparelho text check (length(aparelho) <= 200)
);
create index sessoes_login_conta on overload.sessoes_login (conta_id);

alter table overload.sessoes_login enable row level security;
create policy so_o_dono on overload.sessoes_login
  using (conta_id = overload.conta_atual()) with check (conta_id = overload.conta_atual());
grant select, insert, delete on overload.sessoes_login to overload_api;

-- Tokens de confirmação e de redefinição. Só o hash; o token cru vai no link do e-mail.
create table overload.tokens_email (
  token_hash bytea primary key check (length(token_hash) = 32),
  conta_id uuid not null references overload.contas (id) on delete cascade,
  tipo text not null check (tipo in ('confirmar', 'redefinir')),
  expira_em timestamptz not null,
  usado_em timestamptz
);
alter table overload.tokens_email enable row level security;
-- Sem política e sem privilégio: só as funções da dona leem esta tabela.

-- Fila de e-mails, processada pela API. dados é limpo depois do envio, porque leva o link com o token.
create table overload.tarefas_email (
  id bigint generated always as identity primary key,
  para text not null,
  tipo text not null check (tipo in ('confirmar', 'redefinir')),
  dados jsonb not null default '{}',
  criada_em timestamptz not null default now(),
  tentativas int not null default 0,
  proxima_em timestamptz not null default now(),
  enviada_em timestamptz,
  erro text
);
create index tarefas_email_pendentes on overload.tarefas_email (proxima_em) where enviada_em is null;
alter table overload.tarefas_email enable row level security;

-- ---------- Portas estreitas (security definer, search_path fixo) ----------

-- Cadastro. Devolve null se o e-mail já existe, sem dizer nada a quem chamou.
create function overload.criar_conta(p_email text, p_nome text, p_senha_hash text, p_token_hash bytea, p_link text)
  returns uuid language plpgsql security definer
  set search_path = pg_catalog, overload
  as $$
declare v_id uuid;
begin
  insert into contas (email, nome, senha_hash) values (lower(btrim(p_email)), btrim(p_nome), p_senha_hash)
    on conflict (email) do nothing returning id into v_id;
  if v_id is null then return null; end if;
  insert into tokens_email (token_hash, conta_id, tipo, expira_em) values (p_token_hash, v_id, 'confirmar', now() + interval '2 days');
  insert into tarefas_email (para, tipo, dados) values (lower(btrim(p_email)), 'confirmar', jsonb_build_object('nome', btrim(p_nome), 'link', p_link));
  return v_id;
end $$;

create function overload.conta_para_login(p_email text)
  returns table (id uuid, senha_hash text, confirmada boolean) language sql stable security definer
  set search_path = pg_catalog, overload
  as $$ select c.id, c.senha_hash, c.email_confirmado_em is not null from contas c where c.email = lower(btrim(p_email)) $$;

-- Conta dona do cookie. Estende a validade quando a sessão é usada depois de um dia.
create function overload.conta_da_sessao(p_token_hash bytea)
  returns uuid language plpgsql security definer
  set search_path = pg_catalog, overload
  as $$
declare v_conta uuid;
begin
  update sessoes_login set ultimo_uso_em = now(), expira_em = now() + interval '60 days'
    where token_hash = p_token_hash and expira_em > now() and ultimo_uso_em < now() - interval '1 day'
    returning conta_id into v_conta;
  if v_conta is null then
    select conta_id into v_conta from sessoes_login where token_hash = p_token_hash and expira_em > now();
  end if;
  return v_conta;
end $$;

create function overload.confirmar_email(p_token_hash bytea)
  returns uuid language plpgsql security definer
  set search_path = pg_catalog, overload
  as $$
declare v_conta uuid;
begin
  update tokens_email set usado_em = now()
    where token_hash = p_token_hash and tipo = 'confirmar' and usado_em is null and expira_em > now()
    returning conta_id into v_conta;
  if v_conta is not null then
    update contas set email_confirmado_em = coalesce(email_confirmado_em, now()) where id = v_conta;
  end if;
  return v_conta;
end $$;

-- Novo link de confirmação para quem ainda não confirmou. Não diz se o e-mail existe.
create function overload.reenviar_confirmacao(p_email text, p_token_hash bytea, p_link text)
  returns void language plpgsql security definer
  set search_path = pg_catalog, overload
  as $$
declare v_conta uuid; v_nome text;
begin
  select id, nome into v_conta, v_nome from contas where email = lower(btrim(p_email)) and email_confirmado_em is null;
  if v_conta is null then return; end if;
  insert into tokens_email (token_hash, conta_id, tipo, expira_em) values (p_token_hash, v_conta, 'confirmar', now() + interval '2 days');
  insert into tarefas_email (para, tipo, dados) values (lower(btrim(p_email)), 'confirmar', jsonb_build_object('nome', v_nome, 'link', p_link));
end $$;

create function overload.pedir_redefinicao(p_email text, p_token_hash bytea, p_link text)
  returns void language plpgsql security definer
  set search_path = pg_catalog, overload
  as $$
declare v_conta uuid; v_nome text;
begin
  select id, nome into v_conta, v_nome from contas where email = lower(btrim(p_email));
  if v_conta is null then return; end if;
  insert into tokens_email (token_hash, conta_id, tipo, expira_em) values (p_token_hash, v_conta, 'redefinir', now() + interval '1 hour');
  insert into tarefas_email (para, tipo, dados) values (lower(btrim(p_email)), 'redefinir', jsonb_build_object('nome', v_nome, 'link', p_link));
end $$;

-- Troca a senha pelo link, derruba todas as sessões e dá o e-mail como confirmado (quem abriu o link é dono dele).
create function overload.redefinir_senha(p_token_hash bytea, p_senha_hash text)
  returns uuid language plpgsql security definer
  set search_path = pg_catalog, overload
  as $$
declare v_conta uuid;
begin
  update tokens_email set usado_em = now()
    where token_hash = p_token_hash and tipo = 'redefinir' and usado_em is null and expira_em > now()
    returning conta_id into v_conta;
  if v_conta is null then return null; end if;
  update contas set senha_hash = p_senha_hash, email_confirmado_em = coalesce(email_confirmado_em, now()) where id = v_conta;
  delete from sessoes_login where conta_id = v_conta;
  update tokens_email set usado_em = now() where conta_id = v_conta and tipo = 'redefinir' and usado_em is null;
  return v_conta;
end $$;

-- A fila de e-mail: pega até p_n tarefas vencidas e já agenda a próxima tentativa, para dois processos não pegarem a mesma.
create function overload.pegar_tarefas_email(p_n int)
  returns table (id bigint, para text, tipo text, dados jsonb) language sql security definer
  set search_path = pg_catalog, overload
  as $$
  update tarefas_email t set tentativas = t.tentativas + 1,
         proxima_em = now() + make_interval(mins => power(2, t.tentativas)::int * 5)
   where t.id in (select x.id from tarefas_email x
                   where x.enviada_em is null and x.proxima_em <= now() and x.tentativas < 6
                   order by x.proxima_em limit p_n for update skip locked)
  returning t.id, t.para, t.tipo, t.dados $$;

create function overload.concluir_tarefa_email(p_id bigint, p_erro text)
  returns void language sql security definer
  set search_path = pg_catalog, overload
  as $$
  update tarefas_email set
    enviada_em = case when p_erro is null then now() end,
    dados = case when p_erro is null then '{}'::jsonb else dados end,
    erro = left(p_erro, 500)
  where id = p_id $$;

grant execute on function
  overload.criar_conta(text, text, text, bytea, text),
  overload.conta_para_login(text),
  overload.conta_da_sessao(bytea),
  overload.confirmar_email(bytea),
  overload.reenviar_confirmacao(text, bytea, text),
  overload.pedir_redefinicao(text, bytea, text),
  overload.redefinir_senha(bytea, text),
  overload.pegar_tarefas_email(int),
  overload.concluir_tarefa_email(bigint, text)
to overload_api;

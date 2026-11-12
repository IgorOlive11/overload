-- Ideias para a próxima fase (mock: "Ideias para a semana 7"). Com a fase travada, mudar o plano vira uma ideia anotada.
-- Cada conta lê, anota e apaga só as próprias ideias.
create table overload.ideias (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  texto text not null check (length(btrim(texto)) between 1 and 200),
  criada_em timestamptz not null default now()
);
create index ideias_conta on overload.ideias (conta_id, criada_em);

alter table overload.ideias enable row level security;
create policy so_o_dono on overload.ideias
  using (conta_id = overload.conta_atual()) with check (conta_id = overload.conta_atual());

grant select, insert, delete on overload.ideias to overload_api;

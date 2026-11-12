-- Biblioteca de exercícios e o protocolo: uma semana-tipo repetida durante a fase (decisão do PO de 11/11).
-- As restrições repetem as regras do app, para um cliente adulterado não gravar o que o app oficial não grava.

-- Biblioteca: o mesmo id de texto da exercises_library do v1, para o histórico migrado continuar ligado.
-- Todo mundo lê; ninguém grava pela API (o cadastro é por script, com acesso direto ao banco).
create table overload.biblioteca (
  id text primary key check (length(id) between 1 and 64),
  nome text not null,
  nome_pt text,
  gif_url text,
  musculo text not null check (musculo in ('COSTAS','PEITO','OMBROS','TRÍCEPS','BÍCEPS','QUADRÍCEPS','POSTERIOR','GLÚTEOS','ADUTORES','PANTURRILHA','CORE')),
  acessorios text[] not null default '{}' check (acessorios <@ array['COSTAS','PEITO','OMBROS','TRÍCEPS','BÍCEPS','QUADRÍCEPS','POSTERIOR','GLÚTEOS','ADUTORES','PANTURRILHA','CORE']),
  equipamento text not null check (equipamento in ('barra','smith','carregada','pilha','halteres')),
  pilha_kg numeric(6,2) check (pilha_kg is null or pilha_kg > 0),
  partes text[] not null default '{}',
  instrucoes text[] not null default '{}',
  instrucoes_pt text[],
  atualizado_em timestamptz not null default now()
);
create index biblioteca_busca on overload.biblioteca using gin (to_tsvector('simple', nome || ' ' || coalesce(nome_pt, '')));
grant select on overload.biblioteca to overload_api;

-- Protocolo. versao sobe a cada gravação; quem grava com versão velha recebe conflito.
create table overload.protocolos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  versao int not null default 1 check (versao > 0),
  ativo boolean not null default true,
  agenda text not null check (agenda in ('semana', 'sequencia')),
  descanso int not null check (descanso between 15 and 600),
  descanso_preparo int not null check (descanso_preparo between 10 and 300),
  fase boolean not null default true,
  fase_semanas int not null default 8 check (fase_semanas between 1 and 52),
  meta boolean not null default true,
  meta_n int not null default 3 check (meta_n between 1 and 7),
  nunca_duas boolean not null default true,
  -- Na agenda por sequência, o índice do próximo treino da fila.
  fila int not null default 0 check (fila >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, conta_id)
);
create unique index protocolos_um_ativo on overload.protocolos (conta_id) where ativo;

-- As chaves estrangeiras levam a conta junto: ninguém pendura uma linha no protocolo de outra conta.
create table overload.protocolo_dias (
  protocolo_id uuid not null,
  dia smallint not null check (dia between 0 and 6),
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  folga boolean not null default false,
  primary key (protocolo_id, dia),
  unique (protocolo_id, dia, conta_id),
  foreign key (protocolo_id, conta_id) references overload.protocolos (id, conta_id) on delete cascade
);

-- O id é gerado no app e fica o mesmo entre as edições. O histórico liga ao exercício pela chave, nunca pela posição.
create table overload.protocolo_exercicios (
  id uuid primary key,
  protocolo_id uuid not null,
  dia smallint not null,
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  ordem int not null check (ordem >= 0),
  biblioteca_id text references overload.biblioteca (id),
  -- Exercício sem vínculo com a biblioteca (vindo do CSV): nome, músculo e equipamento ficam aqui.
  nome text check (length(nome) between 1 and 80),
  musculo text check (musculo in ('COSTAS','PEITO','OMBROS','TRÍCEPS','BÍCEPS','QUADRÍCEPS','POSTERIOR','GLÚTEOS','ADUTORES','PANTURRILHA','CORE')),
  equipamento text check (equipamento in ('barra','smith','carregada','pilha','halteres')),
  apelido text check (length(apelido) <= 80),
  -- Vários músculos acessórios por exercício (decisão do PO de 11/11). null segue a biblioteca.
  acessorios text[] check (acessorios <@ array['COSTAS','PEITO','OMBROS','TRÍCEPS','BÍCEPS','QUADRÍCEPS','POSTERIOR','GLÚTEOS','ADUTORES','PANTURRILHA','CORE']),
  -- null é automático; 0 a 3 trava o preparo.
  preparo smallint check (preparo between 0 and 3),
  descanso int check (descanso between 15 and 600),
  descanso_preparo int check (descanso_preparo between 10 and 300),
  foreign key (protocolo_id, dia, conta_id) references overload.protocolo_dias (protocolo_id, dia, conta_id) on delete cascade,
  unique (protocolo_id, dia, ordem) deferrable initially deferred,
  unique (id, conta_id),
  check (biblioteca_id is not null or (nome is not null and musculo is not null and equipamento is not null))
);

create table overload.protocolo_series (
  exercicio_id uuid not null,
  ordem int not null check (ordem >= 0),
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  tipo text not null check (tipo in ('NORMAL', 'REST_PAUSE', 'MUSCLE_ROUND')),
  ger smallint,
  faixa_min smallint,
  faixa_max smallint,
  primary key (exercicio_id, ordem),
  foreign key (exercicio_id, conta_id) references overload.protocolo_exercicios (id, conta_id) on delete cascade,
  check (
    (tipo = 'NORMAL' and ger between 7 and 13 and faixa_min between 1 and 50 and faixa_max between faixa_min and 50)
    or (tipo <> 'NORMAL' and ger is null and faixa_min is null and faixa_max is null)
  )
);

do $$
declare t text;
begin
  foreach t in array array['protocolos', 'protocolo_dias', 'protocolo_exercicios', 'protocolo_series'] loop
    execute format('alter table overload.%I enable row level security', t);
    execute format('create policy so_o_dono on overload.%I using (conta_id = overload.conta_atual()) with check (conta_id = overload.conta_atual())', t);
    execute format('grant select, insert, update, delete on overload.%I to overload_api', t);
  end loop;
end $$;

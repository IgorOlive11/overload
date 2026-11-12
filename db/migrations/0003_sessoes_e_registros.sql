-- Sessões de treino e registros de série. Os ids vêm do aparelho, para o reenvio da fila não duplicar nada.
-- Registro de série só é acrescentado: corrigir um passo passado grava um registro novo que substitui o antigo.

create table overload.sessoes_treino (
  id uuid primary key,
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  protocolo_id uuid,
  protocolo_versao int,
  -- O dia da semana-tipo (0 é segunda) e o índice do treino na ordem do protocolo.
  dia smallint not null check (dia between 0 and 6),
  indice_treino int not null check (indice_treino >= 0),
  -- A data do calendário de quem treinou, para presença e semana da fase não dependerem de fuso.
  dia_local date not null,
  iniciada_em timestamptz not null,
  terminada_em timestamptz,
  -- concluida: chegou ao fim. encerrada: "Encerrar aqui", salva e conta presença. cancelada: descartada, não conta.
  estado text not null default 'em_andamento' check (estado in ('em_andamento', 'concluida', 'encerrada', 'cancelada')),
  recebida_em timestamptz not null default now(),
  unique (id, conta_id),
  foreign key (protocolo_id, conta_id) references overload.protocolos (id, conta_id) on delete set null (protocolo_id),
  check ((estado = 'em_andamento') = (terminada_em is null)),
  check (terminada_em is null or terminada_em >= iniciada_em)
);
create index sessoes_treino_conta on overload.sessoes_treino (conta_id, dia_local);

-- Uma sessão só anda para a frente: de em andamento para concluída, encerrada ou cancelada, e para aí.
create function overload.sessao_so_anda_para_frente() returns trigger
  language plpgsql set search_path = pg_catalog
  as $$
begin
  if old.estado <> 'em_andamento' then
    raise exception 'sessão % já terminou', old.id using errcode = 'check_violation';
  end if;
  if (new.id, new.conta_id, new.protocolo_id, new.protocolo_versao, new.dia, new.indice_treino, new.dia_local, new.iniciada_em)
     is distinct from
     (old.id, old.conta_id, old.protocolo_id, old.protocolo_versao, old.dia, old.indice_treino, old.dia_local, old.iniciada_em) then
    raise exception 'só o estado e o fim da sessão mudam' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger so_anda_para_frente before update on overload.sessoes_treino
  for each row execute function overload.sessao_so_anda_para_frente();

create table overload.registros_serie (
  id uuid primary key,
  conta_id uuid not null default overload.conta_atual() references overload.contas (id) on delete cascade,
  sessao_id uuid not null,
  -- O exercício: id da biblioteca, ou 'nome:' + nome em maiúsculas quando não tem vínculo.
  exercicio_chave text not null check (length(exercicio_chave) between 1 and 90),
  exercicio_id uuid,
  -- A configuração das séries válidas do exercício naquela sessão, como "N10:8-10|RP|MR". A última vez é procurada por ela.
  configuracao text not null check (length(configuracao) between 1 and 200),
  passo text not null check (passo in ('calibracao', 'preparo', 'valida')),
  -- Posição dentro do passo: o 1º preparo, a 2ª série válida.
  ordem int not null check (ordem between 0 and 20),
  tipo text check (tipo in ('NORMAL', 'REST_PAUSE', 'MUSCLE_ROUND')),
  kg numeric(6,2) not null check (kg between 0 and 1000),
  reps smallint check (reps between 0 and 200),
  ger smallint check (ger between 7 and 13),
  b1 smallint check (b1 between 0 and 200),
  b2 smallint check (b2 between 0 and 200),
  blocos smallint check (blocos between 0 and 6),
  ultimo smallint check (ultimo between 0 and 200),
  substitui uuid references overload.registros_serie (id),
  feito_em timestamptz not null,
  recebido_em timestamptz not null default now(),
  foreign key (sessao_id, conta_id) references overload.sessoes_treino (id, conta_id) on delete cascade,
  check (
    (passo = 'valida' and (
       (tipo = 'NORMAL' and reps is not null and b1 is null and blocos is null)
       or (tipo = 'REST_PAUSE' and b1 is not null and b2 is not null and reps is null and blocos is null)
       or (tipo = 'MUSCLE_ROUND' and blocos is not null and ultimo is not null and reps is null and b1 is null)))
    or (passo = 'preparo' and tipo is null and reps is not null)
    or (passo = 'calibracao' and tipo is null and reps is null)
  )
);
create index registros_serie_historico on overload.registros_serie (conta_id, exercicio_chave, configuracao, feito_em desc);
create index registros_serie_sessao on overload.registros_serie (sessao_id);

-- Um substituto só aponta para um registro da mesma conta.
create function overload.substitui_da_mesma_conta() returns trigger
  language plpgsql set search_path = pg_catalog
  as $$
begin
  if new.substitui is not null and not exists (
    select 1 from overload.registros_serie r where r.id = new.substitui and r.conta_id = new.conta_id) then
    raise exception 'registro substituído não existe' using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;
create trigger substitui_da_mesma_conta before insert on overload.registros_serie
  for each row execute function overload.substitui_da_mesma_conta();

alter table overload.sessoes_treino enable row level security;
create policy so_o_dono on overload.sessoes_treino
  using (conta_id = overload.conta_atual()) with check (conta_id = overload.conta_atual());
grant select, insert, update (estado, terminada_em) on overload.sessoes_treino to overload_api;

alter table overload.registros_serie enable row level security;
create policy so_o_dono on overload.registros_serie
  using (conta_id = overload.conta_atual()) with check (conta_id = overload.conta_atual());
-- Sem update e sem delete: só acrescentar.
grant select, insert on overload.registros_serie to overload_api;

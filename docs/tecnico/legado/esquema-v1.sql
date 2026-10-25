-- Esquema do banco do v1 (projeto Supabase "ultima-wepon"), como está no ar.
--
-- Só a estrutura: nenhum dado. Gerado por consulta ao catálogo do Postgres (pg_catalog,
-- information_schema e storage.buckets) em 2026-10-24. As migrações do repositório antigo
-- não refletem este estado, porque o esquema real foi alterado pelo painel.
--
-- Este arquivo é referência, não migração: não rode no banco novo.
-- Itens do v1 que o v2 descartou: papel de usuário (student, trainer, admin), vínculo
-- aluno-treinador e um JSON único por seção. Não use este esquema como modelo do v2.
--
-- Fica de fora: gatilhos e funções internas do schema storage, mantidos pelo Supabase.

-- ---------------------------------------------------------------------------
-- Tabelas (schema public). Todas com RLS ligado.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'student',
  name        text,
  trainer_id  uuid references public.profiles (id) on delete set null,
  constraint profiles_role_check check (role = any (array['student', 'trainer', 'admin']))
);

create table public.user_data (
  user_id     uuid not null references auth.users (id) on delete cascade,
  section     text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint user_data_v2_pkey primary key (user_id, section)
);

create table public.workout_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  log_key     text not null,
  data        jsonb not null,
  updated_at  timestamptz default now(),
  constraint workout_logs_user_id_log_key_key unique (user_id, log_key)
);

create table public.exercise_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  exercise_name  text not null,
  data           jsonb not null,
  updated_at     timestamptz default now(),
  constraint exercise_history_user_id_exercise_name_key unique (user_id, exercise_name)
);

create table public.saved_exercises (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  name     text not null,
  muscle   text,
  constraint saved_exercises_user_id_name_key unique (user_id, name)
);

create table public.meal_logs (
  user_id     uuid not null references auth.users (id) on delete cascade,
  date_str    text not null,
  data        jsonb not null,
  updated_at  timestamptz default now(),
  primary key (user_id, date_str)
);

create table public.micro_logs (
  user_id     uuid not null references auth.users (id) on delete cascade,
  date_str    text not null,
  data        jsonb not null,
  updated_at  timestamptz default now(),
  primary key (user_id, date_str)
);

create table public.exercises_library (
  id                 text primary key,
  name               text not null,
  name_pt            text,
  gif_url            text not null,
  target_muscles     text[] not null default '{}'::text[],
  secondary_muscles  text[] not null default '{}'::text[],
  body_parts         text[] not null default '{}'::text[],
  equipments         text[] not null default '{}'::text[],
  instructions       text[] not null default '{}'::text[],
  instructions_pt    text[],
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices (além das chaves primárias e únicas acima)
-- ---------------------------------------------------------------------------

create index idx_exercises_library_body_parts     on public.exercises_library using gin (body_parts);
create index idx_exercises_library_equipments     on public.exercises_library using gin (equipments);
create index idx_exercises_library_name           on public.exercises_library using gin (to_tsvector('simple'::regconfig, name));
create index idx_exercises_library_target_muscles on public.exercises_library using gin (target_muscles);

-- ---------------------------------------------------------------------------
-- Funções (schema public). Todas security definer, stable, language sql
-- (exceto handle_new_user, plpgsql).
-- ---------------------------------------------------------------------------

create or replace function public.get_my_role() returns text
language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer as $$
  select coalesce(get_my_role() = 'admin', false);
$$;

create or replace function public.is_my_student(student_id uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = student_id and trainer_id = auth.uid());
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Políticas de RLS (schema public). Todas permissivas, role public.
-- ---------------------------------------------------------------------------

-- profiles (seis políticas de escrita se sobrepõem; duas leem user_metadata do JWT)
create policy "admin all"          on public.profiles for all    using (is_admin());
create policy "admin all profiles" on public.profiles for all    using (is_admin());
create policy admin_all_profiles   on public.profiles for all
  using      (((auth.jwt() -> 'user_metadata') ->> 'role') = 'admin')
  with check (((auth.jwt() -> 'user_metadata') ->> 'role') = 'admin');
create policy "own profile"        on public.profiles for all    using (id = auth.uid());
create policy own_profile          on public.profiles for all    using (auth.uid() = id) with check (auth.uid() = id);
create policy read_profiles        on public.profiles for select using (auth.uid() is not null);
create policy "trainer sees students" on public.profiles for select using (is_my_student(id));

-- user_data
create policy own_data on public.user_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy trainer_admin_all on public.user_data for all
  using      (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['trainer', 'admin'])))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['trainer', 'admin'])));

-- workout_logs
create policy "admin all"               on public.workout_logs for all using (is_admin());
create policy "own logs"                on public.workout_logs for all using (user_id = auth.uid());
create policy "trainer rw student logs" on public.workout_logs for all using (is_my_student(user_id));

-- exercise_history
create policy "admin all"                  on public.exercise_history for all using (is_admin());
create policy "own history"                on public.exercise_history for all using (user_id = auth.uid());
create policy "trainer rw student history" on public.exercise_history for all using (is_my_student(user_id));

-- saved_exercises
create policy "admin all"                   on public.saved_exercises for all using (is_admin());
create policy "own saved"                   on public.saved_exercises for all using (user_id = auth.uid());
create policy "trainer rw student saved"    on public.saved_exercises for all using (is_my_student(user_id));

-- meal_logs
create policy "admin all"                on public.meal_logs for all using (is_admin());
create policy "own meal"                 on public.meal_logs for all using (user_id = auth.uid());
create policy "trainer rw student meal"  on public.meal_logs for all using (is_my_student(user_id));

-- micro_logs
create policy "admin all"                 on public.micro_logs for all using (is_admin());
create policy "own micro"                 on public.micro_logs for all using (user_id = auth.uid());
create policy "trainer rw student micro"  on public.micro_logs for all using (is_my_student(user_id));

-- exercises_library
create policy read_exercises_library on public.exercises_library for select using (true);
create policy admin_write_exercises_library on public.exercises_library for all
  using      (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ---------------------------------------------------------------------------
-- Permissões de tabela. anon e authenticated têm todos os privilégios
-- (delete, insert, references, select, trigger, truncate, update) em todas as
-- tabelas de public; quem limita o acesso é a RLS acima.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Bucket "exercises": público, limite de 10485760 bytes (10 MiB), só image/gif.
-- Políticas em storage.objects:
create policy read_exercises_storage on storage.objects for select
  using (bucket_id = 'exercises');
create policy admin_write_exercises_storage on storage.objects for insert
  with check (bucket_id = 'exercises' and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy admin_update_exercises_storage on storage.objects for update
  using      (bucket_id = 'exercises' and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (bucket_id = 'exercises' and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy admin_delete_exercises_storage on storage.objects for delete
  using (bucket_id = 'exercises' and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ---------------------------------------------------------------------------
-- Edge Functions no ar (nome, versão, verify_jwt). O código não está neste arquivo.
-- ---------------------------------------------------------------------------

-- send-email          v14  verify_jwt = false
-- get-student-data    v6   verify_jwt = false
-- save-student-data   v6   verify_jwt = false
-- send-feedback       v4   verify_jwt = true
-- schedule-rest-push  v2   verify_jwt = false

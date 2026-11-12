-- Preparo do banco, rodado uma vez por um superusuário (e de novo sem efeito, se preciso).
-- Cria as duas funções do v2 e o schema. As senhas são definidas por db/preparar.ts, a partir do ambiente.
--   overload_dono: dona do schema e das tabelas. Usada só pelas migrações.
--   overload_api: a API. Não é dona de nada e não ignora a RLS.

do $$
begin
  if not exists (select from pg_roles where rolname = 'overload_dono') then
    create role overload_dono login nobypassrls nosuperuser nocreaterole nocreatedb;
  end if;
  if not exists (select from pg_roles where rolname = 'overload_api') then
    create role overload_api login nobypassrls nosuperuser nocreaterole nocreatedb;
  end if;
end
$$;

alter role overload_dono nobypassrls nosuperuser nocreaterole nocreatedb;
alter role overload_api nobypassrls nosuperuser nocreaterole nocreatedb;

create schema if not exists overload authorization overload_dono;
alter schema overload owner to overload_dono;

-- O schema public não é usado pelo v2.
revoke create on schema public from public;

grant usage on schema overload to overload_api;

-- Funções criadas pela dona não ficam executáveis por qualquer um.
alter default privileges for role overload_dono in schema overload revoke execute on functions from public;

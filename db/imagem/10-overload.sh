#!/bin/sh
# Roda uma vez, quando o volume do banco está vazio. As senhas vêm do ambiente do container do banco.
set -eu
: "${SENHA_OVERLOAD_DONO:?defina SENHA_OVERLOAD_DONO}"
: "${SENHA_OVERLOAD_API:?defina SENHA_OVERLOAD_API}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /overload/papeis.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v dono="$SENHA_OVERLOAD_DONO" -v api="$SENHA_OVERLOAD_API" -v banco="$POSTGRES_DB" <<'SQL'
alter role overload_dono password :'dono';
alter role overload_api password :'api';
grant connect on database :"banco" to overload_dono, overload_api;
SQL

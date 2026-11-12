# Postgres 16 do Overload: na primeira inicialização, cria overload_dono, overload_api e o schema (db/papeis.sql).
# Contexto de build: db/.
FROM postgres:16-alpine
COPY papeis.sql /overload/papeis.sql
COPY imagem/10-overload.sh /docker-entrypoint-initdb.d/10-overload.sh

# Regras do banco

Estas regras valem para tudo dentro de `db/` e se somam ao `AGENTS.md` da raiz. O porquê está na decisão 0015.

## Comandos

- `npm run db:preparar`: uma vez por banco, como superusuário. Cria `overload_dono`, `overload_api` e o schema `overload`, com as senhas do ambiente.
- `npm run db:migrar`: aplica `db/migrations` em ordem, como `overload_dono`.
- `npm test` com `DATABASE_URL_TESTE` definida: cria um banco descartável por arquivo de teste, prepara, migra e roda os testes de `tests/db` e `tests/api`.

## Sempre

- Tudo do v2 fica no schema `overload`. Toda migração qualifica o nome (`overload.contas`).
- Toda tabela com dado de conta tem a coluna `conta_id` com `default overload.conta_atual()`, RLS ligado e a política `so_o_dono` comparando `conta_id` com `overload.conta_atual()` em `using` e em `with check`.
- Chave estrangeira entre tabelas de conta leva a conta junto (`foreign key (x_id, conta_id) references ... (id, conta_id)`), para ninguém pendurar linha no dado de outra conta.
- `overload_api` recebe só o privilégio que a API usa. Registro que é só acrescentado não recebe `update` nem `delete`.
- Toda tabela nova ganha casos em `tests/db/isolamento.test.ts`: a conta dona lê e grava, uma segunda conta não lê, não altera e não apaga, e sem conta nada aparece.
- Regra do app que vira dado (faixa, GER, tipo de série) vira `check` no banco.
- Uma migração por mudança, `NNNN_o_que_faz.sql`.

## Nunca

- Nunca edite uma migração já aplicada: o executor guarda o hash e recusa. Corrija com uma migração nova.
- Nunca dê `bypassrls`, `superuser` ou a posse de tabela a `overload_api`.
- Nunca use `security definer` sem `set search_path` fixo e sem explicar no pull request por que a função precisa dele. Hoje só as portas de conta (login, cookie, links de e-mail e fila de e-mail) usam.
- Nunca decida acesso por dado que o cliente manda: a conta vem só do cookie, conferido no banco.
- Nunca grave senha, token cru ou chave em migração, teste ou log.
- Nunca rode migração em produção a partir de uma sessão de agente sem o dono pedir.

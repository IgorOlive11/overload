# Migração dos dados do v1: semana-tipo, pulse, biblioteca e GIFs

- Status: aceita.
- Data: 2026-11-12
- Quem decidiu: o PO, no chat da sessão do MVP em 12/11, respondendo às quatro perguntas abaixo. Não houve comentário em issue: no MVP a aprovação é pelo chat (Doc "Overload v2: plano do MVP").

## Contexto e problema

O bloco 3 do MVP traz os dados do v1 (Supabase "ultima-wepon") para o banco do v2. O v1 guarda cada seção da conta num JSON (`user_data`: `userProtocol`, `logs`, `exerciseHistory`, `workoutSessions`, `savedExercises`, `achievements`), e o modelo é diferente do v2 em quatro pontos:

1. O protocolo do v1 tem 6 semanas com conteúdo próprio; o v2 tem uma semana-tipo repetida durante a fase.
2. O v1 tem a série pulse, que o v2 tirou (rascunho de regras, Execução da sessão).
3. A biblioteca do v1 tem 1508 exercícios com o equipamento em texto livre; o v2 precisa de uma das cinco categorias.
4. 17 GIFs (os exercícios `custom-*`) estão no bucket `exercises` do Supabase, que sai junto com o v1. Os outros 1491 estão no `static.exercisedb.dev`.

## Decisão

1. A semana-tipo de cada conta é a semana do último treino registrado no v1; sem treino, a semana 1.
2. Série pulse vira série normal com a mesma faixa e o mesmo GER. No histórico, a série pulse não tem repetições e fica de fora.
3. A biblioteca entra inteira, com categoria automática: barra, Smith, halteres e máquina carregada pelo nome do equipamento; polia, máquina e o que não cabe numa categoria (peso do corpo, elástico, bola) entram como máquina de placas até alguém corrigir.
4. Os 17 GIFs ficam no próprio app, em `public/biblioteca/`; os outros continuam no ExerciseDB.

Também valem, sem pergunta, porque seguem regras já registradas:

- A conta entra com o mesmo id, o mesmo e-mail e o mesmo hash bcrypt do v1 (0015), com `origem = 'v1'`.
- Exercício do v1 sem item na biblioteca entra como item novo (`v1-<nome>`), para o protocolo e o histórico continuarem ligados.
- Dieta, push e conquistas do v1 não migram (0010; as conquistas do v2 vêm do número de treinos).
- A ligação do histórico usa a configuração das séries do protocolo migrado quando o formato bate (tipos e faixas), porque o v1 não guardava o GER de cada série feita.

## Como conferir

- `tests/db/migracao-v1.test.ts`, com dados inventados no formato do v1.
- `node db/v1/migrar.ts` com `DATABASE_URL_V1` e `DATABASE_URL_MIGRACAO` mostra o relatório sem gravar; `--aplicar` grava. Conta que já existe no v2 é pulada, então rodar de novo não duplica.

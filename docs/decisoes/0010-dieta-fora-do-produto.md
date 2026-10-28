# Deixar a dieta fora do v2

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O código da V1 tem uma tela de dieta. Ela calcula as calorias pela fórmula de Mifflin-St Jeor com fator de atividade, monta um plano de refeições pelos horários de treino e sono e traz uma lista de micronutrientes. O perfil de peso, altura, idade e sexo só serve a ela (`docs/produto/rascunho-regras.md`, seção do código fora do app).

## O que pesou na decisão

- No código da V1, nenhuma aba ou tela chega até a dieta (`docs/produto/rascunho-regras.md`).
- O perfil de peso, altura, idade e sexo só servia a ela.
- O foco do produto é aderência ao treino e progressão de carga.

## Opções consideradas

1. Deixar a dieta fora do v2.

Nenhuma outra opção está documentada nas fontes.

## Decisão

A opção 1. A tela de dieta e o perfil de peso, altura, idade e sexo, que só servia a ela, ficam fora do v2. A dieta não entra na migração dos dados: ela consta do relatório de cada pessoa como o que não passou para o v2.

## Consequências

- Bom, porque o v2 não carrega uma tela que a V1 já não alcançava por nenhuma aba.
- Bom, porque o v2 não pede peso, altura, idade nem sexo para a dieta.
- Ruim, porque quem tem dados de dieta no v1 não os leva para o v2.

## Como conferir

O v2 não tem rota, tela, tabela nem coluna de dieta, e nenhuma coluna de peso, altura ou sexo para esse fim.

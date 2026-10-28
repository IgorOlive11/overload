# Oráculo de progressão e carga

Casos de entrada e saída das regras de progressão e de carga, gerados executando as funções do mock (`design/mock/`). Toda regra implementada em `src/domain` precisa passar nestes casos.

## Regenerar

```bash
npm run oraculo:gerar
# ou
node tests/oraculo/gerar.mjs
```

O gerador carrega as partes do mock (`doom-face`, `nucleo`, `regras`, `hoje` e `sessao`, na ordem do `build.mjs`) num `vm` do Node, com um DOM de mentira, e chama as funções. A saída não tem data nem aleatoriedade: rodar de novo dá os mesmos bytes. O `npm test` confere isso e confere também que os arquivos versionados são os que o gerador produz. Mudou o mock, rode o comando e confira o diff.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `casos/carga.json` | `roundEq`, `unitOf`, `prepKg`, `bigJump`, `backKg` |
| `casos/progressao.json` | `judge`, `suggestion`, `targetOf`, `planFor`, `lastOf` |
| `casos/preparo.json` | `prepInfo`, `buildSteps`, `shouldCut`, `restBefore`, `weightQuestion` |
| `casos/tabelas.json` | `EQ`, `INC`, `DEFKG` e `RAMPS`, dados de apoio das regras |

## Formato de um caso

```json
{
  "id": "bigJump-03",
  "funcao": "bigJump",
  "origem": "design/mock/regras.js",
  "tipo": "borda",
  "descricao": "incremento exatamente em 10% (placas, 25 kg): não é salto grande",
  "entrada": { "kg": 25, "eq": "pilha" },
  "saida": false
}
```

- `tipo` é `comum` ou `borda` (limite da regra).
- `entrada` usa nomes legíveis; os parâmetros da função e o estado de sessão que ela lê (`S.list`, `S.wk`) estão ali.
- Em `backKg` e `planFor`, `dias_sem_treinar` substitui o cenário do mock (`GAP[scenario]`).

## Divergência entre o mock e a regra

Quando a `docs/decisoes` registra que o mock contradiz a regra, o caso segue a regra e traz `divergencia_do_mock: true`, `decisao` (o registro), `pergunta`, e `saida_do_mock` com o que o mock faz hoje. Hoje há uma: `lastOf` só reaproveita o histórico com séries todas normais, e a regra (0005, pergunta 1) é reaproveitar com a mesma lista de tipos de série. Esses casos têm `entrada.historico` e a saída é escrita no gerador, não calculada pelo mock.

As regras ainda não têm `docs/produto/regras-de-negocio.md` (#24); os casos citam só a 0005. Quando ele existir, reconfira os casos contra ele.

## Fora do oráculo

Dados de exemplo do mock (a faixa 8 a 12 de `N()`, o histórico `H`, `PLAN` e `DEMO`) e as funções de interface, descanso, duração, CSV e conquistas.

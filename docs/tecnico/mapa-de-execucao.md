# Mapa de execução

A issue fixada #63 mostra o backlog como um diagrama Mermaid: fases (milestones), épicos (sub-issues de primeiro nível), tarefas e setas de bloqueio. Ela se atualiza sozinha. O PO usa o mapa para decidir em que ordem mandar o agente trabalhar.

## Como ler

- Uma seta vai de quem bloqueia para quem é bloqueado.
- Verde: liberada para o agente (`pronta-para-agente`). Azul: tarefa do PO (`tarefa-do-po`). Laranja: bloqueada ou sem etiqueta. Cinza escuro: concluída.
- Fase sem tarefa concluída nem liberada aparece recolhida, com o nome e a quantidade de épicos.
- A issue do mapa não é tarefa: não recebe `pronta-para-agente` e fica fora das contas.

## Quando atualiza

O workflow `sincronizar-etiqueta.yml` roda quando uma issue é aberta, fechada, reaberta, etiquetada ou desetiquetada; a cada 5 minutos (mudança de Status e de bloqueio não gera evento); e pelo botão Run workflow. O passo do mapa vem depois da sincronização da etiqueta. Se o texto gerado é igual ao da descrição, a issue não é reescrita.

## Peças

- `.github/mapa/montar-mapa.mjs`: função pura, dados em, Markdown fora.
- `.github/mapa/gerar-mapa.mjs`: lê a API REST com o `github.token` e grava na issue (`MAPA_ISSUE`). Localiza a issue pelo marcador `<!-- mapa-de-execucao -->` no corpo e recusa escrever se ele não estiver lá.
- `docs/tecnico/mapa-workflow.yml`: a versão nova do workflow.
- `tests/mapa/`: os testes.

## Como aplicar o workflow

O agente não tem permissão para alterar `.github/workflows/`. O dono aplica à mão:

```
cp docs/tecnico/mapa-workflow.yml .github/workflows/sincronizar-etiqueta.yml
```

O teste `tests/mapa/workflow.test.mjs` confere o arquivo em `docs/tecnico/`. Mantenha os dois iguais.

## Limites desta parte

- Só a parte 1 (árvore). Sprint e linha do tempo vêm depois.
- O estado vem das etiquetas, que a sincronização já deixou iguais ao Status. O mapa não lê o Projects nesta parte.
- O mapa só lê; nunca muda Status, Sprint ou Estimativa.
- O projeto tem limite de 100 itens na sincronização (já existia).

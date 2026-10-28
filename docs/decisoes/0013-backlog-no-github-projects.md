# Manter o backlog no GitHub Projects

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O v2 precisa de um lugar para o backlog. O rascunho de arquitetura (`docs/tecnico/rascunho-arquitetura.md`, seção "Roadmap") tem como próximo passo transformar cada fase em issues no GitHub Projects.

## O que pesou na decisão

- O backlog fica no mesmo lugar das issues, dos pull requests e dos workflows, que é por onde os agentes trabalham.

## Opções consideradas

1. GitHub Projects.

Nenhuma outra opção está documentada nas fontes.

## Decisão

A opção 1. O backlog fica no GitHub Projects. Um workflow liga o Status do quadro à etiqueta `pronta-para-agente`.

## Consequências

- Bom, porque issues, pull requests, workflows e backlog ficam num lugar só.
- Bom, porque o Status do quadro e a etiqueta `pronta-para-agente` andam juntos.
- Ruim, porque o backlog depende do GitHub.

## Como conferir

O quadro do GitHub Projects tem o backlog, e o workflow que liga o Status à etiqueta `pronta-para-agente` é o `.github/workflows/sincronizar-etiqueta.yml`.

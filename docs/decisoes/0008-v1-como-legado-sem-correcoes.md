# Manter o v1 como legado, sem correções, até o desligamento

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O v1 (repositório ultima-weapon) está no ar, em overload.app.br, com pessoas de verdade usando. O rascunho de arquitetura (`docs/tecnico/rascunho-arquitetura.md`) lista falhas de segurança nele. O v2 é reconstruído a partir do mock, e o aproveitamento do código do v1 está no registro [0003](0003-aproveitamento-da-v1.md).

## O que pesou na decisão

- O v2 é a base daqui para frente. O v1 só precisa durar até o desligamento.
- Os dados de quem usa o v1 precisam chegar ao v2.

## Opções consideradas

1. Tratar o v1 como legado: continua no ar até o desligamento, não recebe correções, e os dados passam para o v2 por script.

Nenhuma outra opção está documentada nas fontes.

## Decisão

A opção 1. O v1 continua no ar até o desligamento na Fase 3 (épico #20) e não recebe correções. Os dados dele passam para o v2 por script, com um relatório por pessoa. Como o v2 convive com o v1 no mesmo banco é decidido pela spike #38.

## Consequências

- Bom, porque o esforço fica no v2.
- Ruim, porque as falhas do v1 listadas no rascunho de arquitetura continuam abertas até o desligamento: o gatilho de cadastro que copia o papel de `raw_user_meta_data`, a política `own_profile` que vale para todas as operações no próprio perfil, a política `admin_all_profiles` que confere o papel no `user_metadata`, e a função `send-email`, que não confere a assinatura.

## Como conferir

Nenhuma issue ou pull request altera o código nem o banco do v1. A migração dos dados é feita por script, e cada pessoa recebe o relatório do que passou para o v2.

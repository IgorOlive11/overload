# Entregar o v2 como PWA, sem publicar nas lojas de aplicativos

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O rascunho de arquitetura (`docs/tecnico/rascunho-arquitetura.md`, seção "Arquitetura para chegar às lojas") parte de um app que roda como PWA e também vira app de iOS e Android. Isso traz exigências das duas lojas (diretriz 4.2 da Apple, exclusão de conta dentro do app, teste fechado de 14 dias no Google Play) e taxas de conta de desenvolvedor. O Overload é gratuito e sem fins lucrativos, mantido por uma pessoa só, e é preciso decidir por onde o v2 chega a quem usa.

## O que pesou na decisão

- O maior risco apontado no rascunho não é técnico: é uma pessoa só cuidando de app, servidor, lojas e privacidade.
- As lojas cobram taxa de conta de desenvolvedor: US$ 99 por ano na Apple e US$ 25 uma vez no Google Play (rascunho de arquitetura, seção "Custos").
- O app é gratuito e sem fins lucrativos.

## Opções consideradas

1. PWA, sem lojas.
2. PWA e apps nas lojas, como o rascunho de arquitetura descreve hoje.

## Decisão

A opção 1. O v2 é só PWA e não vai para a App Store nem para o Google Play. O Capacitor, que seria o caminho para as lojas, está descartado no registro [0007](0007-capacitor-descartado.md).

## Consequências

- Bom, porque as taxas de conta de desenvolvedor deixam de existir (veja o registro 0007).
- Bom, porque as exigências das lojas descritas no rascunho deixam de ser requisito do v2.
- Ruim, porque o v2 não aparece nas lojas.
- Ruim, porque o rascunho de arquitetura ainda descreve o caminho das lojas e não vale como decisão nesses pontos. A #24 e a #32 o revisam.

## Como conferir

O repositório não tem projeto de iOS nem de Android, e nenhuma dependência de empacotamento para as lojas. A entrega é a PWA publicada na Vercel.

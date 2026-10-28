# Descartar o Capacitor, porque o v2 é só PWA

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O rascunho de arquitetura (`docs/tecnico/rascunho-arquitetura.md`, seção "Arquitetura para chegar às lojas") diz "A decisão é Capacitor": o mesmo código React e TypeScript rodaria como PWA e viraria app de iOS e Android. Essa decisão foi superada pela de não publicar nas lojas ([0006](0006-pwa-em-vez-de-lojas.md)), e o `0002` já cita o caminho como descartado.

## O que pesou na decisão

- O Capacitor só existe no rascunho como caminho para as lojas.
- Ir às lojas exige conta de desenvolvedor paga. Os valores do rascunho de arquitetura (seção "Custos"), na cotação PTAX de 14/10/2026: Apple Developer Program, US$ 99 por ano; conta do Google Play, US$ 25 uma vez.

## Opções consideradas

1. Não usar o Capacitor: o v2 é só PWA.
2. Usar o Capacitor, como o rascunho de arquitetura descreve hoje.

## Decisão

A opção 1. O Capacitor está descartado, não adiado. Se um dia isso mudar, a mudança vira uma decisão nova que substitui esta.

## Consequências

- Bom, porque o custo de conta de desenvolvedor é evitado: US$ 99 por ano na Apple e US$ 25 uma vez no Google Play, na cotação de 14/10/2026 (fonte: seção "Custos" do rascunho de arquitetura).
- Bom, porque o app não carrega a WebView nativa e os plugins do Capacitor.
- Ruim, porque o rascunho de arquitetura ainda diz "Capacitor" em vários trechos. Nesses pontos ele não vale como decisão até a #24 e a #32 o revisarem.

## Como conferir

O `package.json` não tem dependência `@capacitor/*` e o repositório não tem a pasta `ios/` nem `android/`.

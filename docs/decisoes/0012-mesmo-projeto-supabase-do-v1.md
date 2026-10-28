# Usar o mesmo projeto Supabase do v1 em produção

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O v1 usa um projeto Supabase em produção, com pessoas de verdade cadastradas. O v2 precisa decidir se usa esse projeto ou cria um novo (`docs/tecnico/rascunho-arquitetura.md`, seção "Migração do v1").

## O que pesou na decisão

- Cada pessoa entra no v2 com o mesmo e-mail e a mesma senha.
- Um projeto novo exigiria copiar os usuários do Auth com os hashes de senha, um passo a mais que pode dar errado.

## Opções consideradas

1. Usar o mesmo projeto Supabase do v1.
2. Criar um projeto novo e copiar os usuários do Auth com os hashes de senha.

## Decisão

A opção 1, para produção. O banco de desenvolvimento é outro projeto, configurado na #30. Como o v2 convive com o v1 no mesmo banco é decidido pela spike #38.

## Consequências

- Bom, porque ninguém precisa de nova senha nem de novo cadastro.
- Bom, porque não há cópia de usuários do Auth.
- Ruim, porque o v2 divide o banco de produção com o v1, e a forma de conviver fica para a spike #38.

## Como conferir

A configuração de produção do v2 aponta para o mesmo projeto Supabase do v1, e a de desenvolvimento aponta para outro projeto (#30).

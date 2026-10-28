# Não ter papel de administrador nem de treinador no v2

- Status: aceita
- Data: 2026-10-28
- Quem decidiu: IgorOlive11 (PO), em 2026-10-28, a partir da #28 e [deste comentário](https://github.com/IgorOlive11/overload/issues/28#issuecomment-6469514398)

## Contexto e problema

O v1 tem os papéis de aluno, treinador e admin, e eles têm falhas de segurança (`docs/produto/rascunho-regras.md`, seção de cadastro e papéis; `docs/tecnico/rascunho-arquitetura.md`). O v2 precisa decidir se mantém esses papéis, e como fica o cadastro de exercícios, que na V1 era feito por um admin dentro do app.

## O que pesou na decisão

- Os papéis do v1 têm falhas.
- Na resposta 3 do [0003](0003-aproveitamento-da-v1.md), o PO decidiu que o cadastro de exercícios fica só no script: o painel de admin da V1 foi removido para eliminar uma fonte de fragilidade, e não volta como painel separado.
- O [0005](0005-cruzamento-das-regras-com-o-mock.md) registra como resolvidos, a partir dessa resposta, o cadastro, a aba Exercícios e o papel de admin.

## Opções consideradas

1. Remover os papéis: o v2 não tem treinador nem admin.

Nenhuma outra opção está documentada nas fontes.

## Decisão

A opção 1. O v2 não guarda papel nenhum, e cada conta só acessa os próprios dados. O cadastro de exercícios sai do app e é feito por script com a chave de serviço (épico #21), rodado fora do app. Quem depende do PO para treinar recebe o protocolo em CSV e o importa na própria conta.

## Consequências

- Bom, porque as falhas de papel do v1 não têm como se repetir: não existe papel para alterar.
- Bom, porque nenhuma conta lê ou grava dados de outra pelo app.
- Ruim, porque não há aba Exercícios nem painel de admin: o cadastro depende de rodar o script.
- Ruim, porque não há visão de treinador sobre alunos.

## Como conferir

Nenhuma tabela, política de acesso ou função do v2 lê ou grava papel. Toda política de acesso do v2 é "só o dono". A chave de serviço não aparece no código do app.

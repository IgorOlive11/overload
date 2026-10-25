# Apagar o ERD.png e manter o diagrama do v2 em Mermaid, conferido pelas migrações

- Status: aceita
- Data: 2026-10-25
- Quem decidiu: IgorOlive11 (PO), em 2026-10-25, a partir da proposta da spike #22

## Contexto e problema

O `ERD.png` na raiz mostra o banco da V1, com o papel de usuário, o vínculo entre aluno e treinador e um JSON por seção em `user_data`. As três coisas foram descartadas no v2, e o `AGENTS.md` já manda não usar o `ERD.png` como referência. O banco real da V1 também não bate com as migrações do ultima-weapon, porque foi alterado pelo painel. Esse esquema real já está em texto em `docs/tecnico/legado/esquema-v1.sql`.

O modelo do v2 vai nascer nas migrações de `supabase/`, criadas com a skill `nova-tabela`. A pergunta é se um diagrama novo traz ganho, ou se só cria trabalho.

## O que pesou na decisão

- Um diagrama errado é pior do que nenhum: um agente ou uma pessoa pode confiar nele. Isso já acontece com o `ERD.png`, a ponto de o `AGENTS.md` precisar de um aviso para ele.
- Uma imagem não aparece no diff. Ninguém revisa um `.png` num pull request, e por isso ele envelhece sem ninguém notar.
- O GitHub mostra blocos Mermaid (`erDiagram`) dentro do Markdown, sem nenhuma dependência no projeto. Um diagrama em texto muda no mesmo diff da migração e passa pela revisão.
- Quem lê o diagrama: o PO, para validar o modelo sem ler SQL, e quem chega no projeto. Agentes leem as migrações e os tipos gerados, então para eles o diagrama é secundário.
- O v2 tem poucas tabelas: `profiles`, `exercises_library`, as quatro tabelas do protocolo, `sessions` e `set_logs` (rascunho de arquitetura). Um diagrama desse tamanho se escreve à mão em minutos.
- A V1 já tem uma referência em texto mais completa e correta que o `ERD.png`: o `esquema-v1.sql`.

## Opções consideradas

1. Apagar o `ERD.png` e manter um diagrama Mermaid do v2 em `docs/tecnico/`, atualizado no mesmo pull request de cada migração que muda tabela ou relação.
2. Apagar o `ERD.png` e não ter diagrama: as migrações e os tipos gerados são a única referência.
3. Manter o `ERD.png` como está, com o aviso do `AGENTS.md`.
4. Gerar um `.png` novo do v2 com uma ferramenta de diagrama, como o visualizador de esquema do painel do Supabase.

## Decisão

A recomendação é a opção 1. Apagar o `ERD.png` tira uma fonte errada do repositório sem perder nada, porque o `esquema-v1.sql` cobre a V1. Para o v2, um diagrama Mermaid custa pouco, aparece no diff e serve ao PO na revisão do modelo. A opção 2 também seria aceitável, mas deixa o PO sem uma visão do modelo fora do SQL. A opção 4 repete o problema do `ERD.png`: uma imagem que ninguém revisa.

O diagrama só começa quando a primeira migração do v2 existir. Antes disso, ele só repetiria o rascunho de arquitetura, que ainda vai ser revisado (#32).

## Consequências

- Bom, porque o repositório deixa de ter uma fonte de modelo de dados que o próprio `AGENTS.md` manda ignorar.
- Bom, porque o diagrama muda no mesmo diff da migração, e o revisor vê os dois juntos.
- Ruim, porque é um passo a mais em cada pull request que mexe em tabela. A skill `nova-tabela` precisa lembrar dele, ou ele envelhece como o `ERD.png`.
- Ruim, porque um diagrama feito à mão pode divergir da migração se a revisão deixar passar. O teste que confere se cada tabela das migrações aparece no diagrama reduz esse risco.
- `AGENTS.md`: a frase da seção Estado atual que cita o `ERD.png` deixa de fazer sentido quando o arquivo sair e precisa ser ajustada na mesma issue. Este registro não muda o `AGENTS.md`.

## Como conferir

- Não existe `ERD.png` na raiz.
- Existe um diagrama Mermaid do v2 em `docs/tecnico/`, e cada tabela criada nas migrações de `supabase/` aparece nele.
- A skill `nova-tabela` tem um passo para atualizar o diagrama.

## Issues de acompanhamento sugeridas

- Apagar o `ERD.png` e ajustar a frase do `AGENTS.md` que cita o arquivo.
- Criar o diagrama Mermaid do v2 junto com a primeira migração, acrescentar o passo à skill `nova-tabela` e escrever um teste em `tests/` que confira se toda tabela das migrações aparece no diagrama.

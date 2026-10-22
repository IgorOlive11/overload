---
name: ler-a-tarefa
description: Use no começo de toda issue do Overload, antes de escrever qualquer código. Lê a issue, as fontes que ela cita e devolve um plano para aprovação.
---

# Ler a tarefa

1. Leia a issue inteira, incluindo os comentários. Confirme que ela está com o status Pronta para o agente no GitHub Projects. Se não estiver, pare e avise.
2. Abra cada fonte citada na seção Fontes da issue:
   - a seção de `docs/produto` indicada;
   - a captura em `design/mock/telas`, se for tarefa de tela;
   - os arquivos de `docs/decisoes` relacionados.
3. Compare a issue com as fontes. Se houver divergência entre a issue, o mock e a regra de negócio, não escolha: escreva a divergência como pergunta na issue e pare.
4. Escreva o plano como comentário na issue, com estas partes:
   - **Entendimento:** o que a issue pede, com as suas palavras, em até cinco linhas.
   - **Arquivos:** quais arquivos serão criados ou alterados.
   - **Testes:** um teste por critério de aceite, com o nome que cada um vai ter.
   - **Fora do escopo:** o que você notou e não vai fazer.
   - **Dúvidas:** o que precisa de resposta antes de começar. Se estiver vazio, escreva "nenhuma".
5. Espere a aprovação do plano antes de escrever código.

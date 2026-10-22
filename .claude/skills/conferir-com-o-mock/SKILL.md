---
name: conferir-com-o-mock
description: Use no fim de toda tarefa de tela do Overload, antes de abrir o pull request. Compara a tela construída com a mesma tela do mock e anexa as duas capturas.
---

# Conferir com o mock

1. Rode o build do mock em `design/mock` e abra o resultado no navegador do Playwright.
2. Navegue até a tela citada na issue, no mesmo estado descrito nos critérios de aceite.
3. Abra a mesma tela no app local, com `npm run dev`, no mesmo estado e na mesma largura de tela: 390 px, a largura de um celular.
4. Tire uma captura de cada uma.
5. Compare as duas e liste no pull request cada diferença que encontrar: espaçamento, texto, cor, fonte, animação ou ordem dos elementos.
6. Corrija as diferenças que não foram pedidas na issue. As que forem intencionais ficam listadas com o motivo.
7. Anexe as duas capturas lado a lado no pull request.

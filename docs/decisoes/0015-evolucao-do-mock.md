# Evoluir o mock em design/mock por pull request, com prévia gratuita, e congelar o artifact

- Status: proposta
- Data: 2026-10-28
- Quem decidiu: a decidir. O PO aceita ou rejeita na #46; até lá este registro é só a recomendação da spike.

## Contexto e problema

O mock existe em duas cópias: em partes, em `design/mock/` (`README.md`, `build.mjs`), e como artifact do Claude, onde nasceu. Cada mudança numa cópia afasta a outra. A pergunta da #46 é como evoluir o mock daqui para frente mantendo a dinâmica em que ele foi criado: o PO pede uma mudança em linguagem natural, vê o resultado renderizado e ajusta.

O que o repositório já exige do mock:

- #27: `npm run mock:telas` (`design/mock/capturar.mjs`) roda o build e grava em `design/mock/telas` uma imagem por tela e estado, com viewport de 390 px, animações desligadas, relógio fixo e `Math.random` com semente. As imagens são a referência da revisão humana e do teste de comparação visual. O agente das tarefas de tela lê as partes do mock, não as imagens.
- #33: `tests/mock/mock.test.mjs` confere que o mock está em partes sem base64, que o build gera o HTML completo e que as quatro telas abrem sem erro. `tests/mock/telas.test.mjs` confere as 13 referências e a repetibilidade da captura (duas rodadas no mesmo ambiente, não contra os PNGs versionados).
- O `0005` lista os pontos em que o mock contradiz a regra de negócio: padrão da série nova, faixa 8 a 12 nos exemplos, remoção da última série no montador avançado, GER 9 e preparo de 90 s do importador, texto da lateral. Quem corrige isso precisa de um lugar revisável para fazê-lo, e as correções tendem a ser pedidas pelo PO em linguagem natural.

Limite desta pesquisa: só consegui ler a documentação pública do Vercel. As páginas do Figma, dos artifacts do Claude e do GitHub Actions não puderam ser consultadas na sessão. O que depende delas, ou da conta do PO, está marcado **não verificado**.

## O que pesou na decisão

Os cinco critérios da issue:

1. Fonte única do mock, e o agente das tarefas de tela lê essa fonte.
2. O PO pede e vê uma mudança sem escrever código.
3. A mudança é revisável: dá para ver o que mudou de uma versão para a outra.
4. As referências da #27 e o teste da #33 continuam funcionando.
5. Custo zero: sem dependência nova, conta nova ou plano pago (resposta do PO na #46).

## Opções consideradas

1. Editar `design/mock/` por pull request, com prévia a cada PR.
2. Continuar nos artifacts do Claude e trazer cada versão para o repositório depois.
3. O tipo Design dos artifacts do Claude.
4. O Figma.

| Critério | 1. PR em `design/mock/` | 2. Artifact e trazer depois | 3. Tipo Design | 4. Figma |
| --- | --- | --- | --- | --- |
| Fonte única, lida pelo agente | Sim. As partes são a fonte; o artifact deixa de ser editado. | Não. Há duas fontes e a cópia do repositório sempre atrasa. | Não verificado. Só seria fonte única se exportar para as partes. | Não. O desenho fica fora do repositório. O mock tem Babylon.js (3D) e as regras de progressão em `regras.js`, que o Figma não executa. O `build.mjs` não consome Figma. |
| PO pede e vê sem código | Sim, desde que haja prévia: o pedido é um comentário na issue, o agente edita e a prévia mostra o resultado. Sem prévia, o PO teria de rodar o build. | Sim. É a dinâmica original. | Não verificado. | Parcial. Edição visual, mas sem o comportamento do mock (série, descanso, reel). Não verificado o que o conector entrega ao agente na conta do PO. |
| Mudança revisável | Sim. O diff de cada parte mostra o que mudou, e as capturas regeneradas mostram o efeito. | Não. A versão é um blob; a diferença só aparece comparando a mão. | Não verificado. | Não verificado. O histórico de versões do Figma não aparece no pull request. |
| #27 e #33 intactas | Sim. Nada muda em `capturar.mjs` nem nos testes. | Só depois de trazer a versão; a captura roda sobre o que está no repositório. | Não verificado. | Não. Seria preciso reescrever o mock em HTML para o `capturar.mjs` ter o que capturar. |
| Custo | Zero (ver prévia abaixo). | Zero. | Não verificado. Depende do plano da conta do PO. | Não verificado. Depende do plano e do tipo de assento da conta do PO; a licença do Figma não é da conta do projeto. |

### Prévia da opção 1

A prévia é o que permite ao PO "ver sem rodar nada". Três formas, todas a custo zero:

- **A. Capturas no próprio pull request.** O agente roda `npm run mock:telas` e anexa as imagens das telas mudadas. Não exige configuração nem conta. Limite: são imagens, sem interação. As imagens do ambiente do agente também podem diferir em pixels das versionadas (`README.md` do mock); por isso a regra é regenerar todas no mesmo ambiente na mudança.
- **B. Projeto estático na Vercel.** O Overload já planeja a Vercel no plano Hobby (`docs/tecnico/rascunho-arquitetura.md`). Segundo a documentação do plano, o Hobby é gratuito, limitado a uso pessoal e não comercial (caso do Overload) e traz 100 deploys por dia; a Vercel Authentication protege as prévias e os links compartilháveis estão incluídos no Hobby. Um segundo projeto na mesma conta, com comando de build `node design/mock/build.mjs` e saída `design/mock/dist`, daria uma URL por pull request. **Não verificado:** o comportamento exato de prévia por branch num projeto sem framework, o comentário automático no PR e se a conta do PO já tem a integração com o repositório. Exige uma configuração única do PO no painel da Vercel (conta que ele já tem, não nova).
- **C. Artefato do GitHub Actions** com o `dist`. Exigiria editar `.github/workflows`, que o agente não pode fazer, e o PO teria de baixar o zip e servir a pasta (o HTML carrega `babylon-mini.js` ao lado). Não cumpre "sem rodar nada". Gratuidade e retenção do artefato: não verificado.

## Decisão

Proposta: a opção 1. O mock é evoluído em `design/mock/` por pull request, e o artifact do Claude é congelado como histórico.

Prévia: começar pela forma A, que funciona hoje sem nenhuma permissão nova, e o PO decide se liga a forma B (uma configuração na Vercel) quando quiser interação na prévia. A forma C fica descartada. Nenhuma das duas formas custa dinheiro nem pede conta nova.

Por que a opção 1: é a única que cumpre os critérios 1, 3 e 4 sem depender de algo que não consegui verificar, e preserva a dinâmica do PO, porque o pedido continua em linguagem natural (um comentário na issue) e o resultado continua renderizado (capturas ou prévia). As opções 3 e 4 não podem ser recomendadas enquanto o que dependem da conta do PO não for confirmado; se o PO já testou alguma delas, essa informação reabre a comparação.

### Fluxo de uma mudança de mock, do pedido ao merge

1. O PO abre uma issue de tela ou de ajuste do mock, ou comenta numa existente, descrevendo a mudança em linguagem natural (por exemplo "o padrão da série nova deve ser normal, GER 10, 8 a 10"). A issue leva a etiqueta `pronta-para-agente`.
2. O agente lê a tarefa, confere a regra em `docs/produto/` e publica o plano na issue. O PO aprova com uma menção.
3. O agente cria o branch `agente/<número>-<assunto>` e edita só as partes de `design/mock/` envolvidas (`regras.js`, `plano-montador.js`, `estrutura.html` etc.). Se a mudança altera uma regra de negócio, `docs/produto/` entra no mesmo pull request, e a regra vale sobre o mock em caso de conflito.
4. O agente roda `node design/mock/build.mjs` e `npm run mock:telas`, e commita as partes e as imagens regeneradas de `design/mock/telas`.
5. O agente roda `npm test`, `npm run lint` e `npm run typecheck`, chama o subagente `revisor` e abre o pull request com o parecer.
6. O PO vê o resultado no pull request: o diff das partes, as imagens das telas mudadas (forma A) e, se a Vercel estiver ligada, a URL da prévia (forma B). Para ajustar, comenta no pull request ou na issue com a mesma linguagem natural, e o agente repete os passos 3 a 5 no mesmo branch.
7. O CI passa e o PO faz o merge. Depois do merge, a pasta `design/mock/` é a única versão vigente do mock.

### Artifact do Claude

Fica congelado como histórico: ninguém edita mais o artifact, e o `design/mock/README.md` ganha uma linha apontando para o repositório como fonte. Se o PO quiser explorar uma ideia nova no artifact, o resultado só vale depois de virar pull request em `design/mock/`. Esse aviso, a ligação da prévia e a correção dos pontos do `0005` são sugestões de issues novas, fora desta spike.

## Consequências

- Bom, porque há uma fonte só do mock e o agente das tarefas de tela lê exatamente ela.
- Bom, porque toda mudança de mock é um diff de texto nas partes, junto com as imagens que mostram o efeito.
- Bom, porque a #27 e a #33 não mudam e o custo é zero.
- Ruim, porque, sem a Vercel ligada, a prévia é feita de imagens e o PO não interage com o mock antes do merge.
- Ruim, porque o PO deixa de editar direto no artifact, onde o resultado aparecia na hora; agora passa pelo agente e por um pull request.
- Ruim, porque as opções 3 e 4 ficam sem avaliação completa: dependem da conta do PO e de documentação que não consegui consultar.

## Como conferir

- Existe `docs/decisoes/0015-evolucao-do-mock.md`, no formato de `0000-modelo.md`, com as quatro opções, a recomendação e o fluxo.
- Depois que o PO aceitar na #46, o status muda para aceita e cita o comentário dele.
- `npm test` e `node design/mock/build.mjs` seguem passando sem mudança, o que mostra que a #27 e a #33 continuam funcionando com a recomendação.

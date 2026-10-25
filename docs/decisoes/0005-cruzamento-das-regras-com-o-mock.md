# Validar o rascunho de regras contra o mock e a spike #22, com as divergências resolvidas e as perguntas que sobram

- Status: aceita
- Data: 2026-10-25
- Quem decidiu: IgorOlive11 (PO), em 2026-10-25, a partir da proposta da spike #25

## Contexto e problema

O `docs/produto/rascunho-regras.md` compara as regras da V1 com as "regras atuais", que são as decisões da conversa e o mock publicado em 20 de outubro. Antes de a #24 escrever `docs/produto/regras-de-negocio.md`, a #25 pergunta duas coisas:

1. o rascunho reflete o MVP que está no mock (`design/mock/`)?
2. o rascunho está coerente com a spike #22, em especial com as cinco respostas do PO em `docs/decisoes/0003-aproveitamento-da-v1.md`?

Fontes lidas, no commit 724fa6a: o rascunho inteiro (seis tabelas, a lista de código fora do app e os doze conflitos), o código do mock (`regras.js`, `sessao.js`, `csv.js`, `doom-face.js`, `plano-montador.js`, `plano-simples.js`, `primeiro-acesso.js`, `guia.js`, `hoje.js` e `estrutura.html`) e os registros 0002, 0003 e 0004. A pasta `design/mock/telas/` está vazia, então a conferência foi feita pelo código do mock.

Este registro não escreve a regra final. Ele é o insumo da #24.

## O que pesou na decisão

- Em conflito, vale a regra de negócio. No rascunho, a regra de negócio é a coluna "Regra atual" e os comentários do PO; no mock, é o que o código faz. Quando o mock contradiz a regra atual, a resolução proposta segue a regra.
- As cinco respostas do PO na 0003 valem como regra de negócio e entram aqui como resolvidas. Nenhuma volta como pergunta.
- O mock tem duas camadas: a regra (pergunta de carga, progressão, preparo, CSV) e dados de exemplo (o plano da fase 1, o histórico `H`, o rascunho da fase 2 no montador). Dado de exemplo que foge da regra não é divergência de regra, mas é registrado para a #24 não copiá-lo como regra.
- Os comentários do PO no rascunho são de 20 de outubro. Alguns já foram atendidos pelo mock atual e não são mais divergência.

## Opções consideradas

1. Cruzar linha a linha e separar o que já tem resposta (coerente ou resolvido) do que ainda precisa do PO, propondo uma resolução para cada divergência.
2. Devolver só a lista de perguntas, sem resolução proposta.

## Decisão

A opção 1. A #24 precisa saber o que já pode escrever sem esperar o PO, e a maior parte das linhas do rascunho já tem resposta.

### Resumo

- O rascunho reflete o mock na maior parte das regras de execução, progressão, preparo, descanso, CSV e aderência.
- Há três tipos de problema: o rascunho ficou desatualizado em relação às respostas do PO na 0003 (painel de admin, crédito da ExerciseDB, conflito 12); o rascunho se contradiz internamente (faixas "cinco" contra "quatro", músculo acessório, dica do reel); e o mock contradiz a regra atual em detalhes (padrão da série nova, faixa 8 a 12 nos exemplos, texto da lateral sobre o cadastro da biblioteca).
- Sobram 14 perguntas para o PO, listadas no fim. Os conflitos 1, 4 e 12 do rascunho deixam de ser pergunta.

### Resolvidas pela spike #22

| Resposta do PO na 0003 | Linha afetada no rascunho | Situação |
| --- | --- | --- |
| 1. O filtro neon dos GIFs entra no MVP, mesmo sem aparecer no mock. | Biblioteca: "Os GIFs recebem um filtro neon" (Mantém). | Coerente. O mock não mostra o filtro; a regra vem da resposta do PO. |
| 2. O mapeamento dos equipamentos da ExerciseDB para as cinco categorias vai para a spike #43. | Biblioteca: "O equipamento é um texto livre" (Muda para categoria). | Coerente. A regra (categoria e tamanho da pilha) fica; quem define a categoria de cada exercício é a #43. |
| 3. Cadastro de exercícios só por script, sem painel de admin, nem separado. | Execução: comentário do PO na linha do passo a passo ("painel de admin com rota separada"); Biblioteca: "O admin cadastra" (Muda); conflito 12; lateral do mock (`estrutura.html`, "Fora do MVP": "vai para um painel web separado, mais à frente no roadmap"). | Resolvida. O comentário do PO no rascunho e o texto da lateral do mock ficaram desatualizados. A #24 escreve: o cadastro é só pelo script com a chave de serviço, fora do app, e não há painel previsto. |
| 4. A biblioteca continua vindo da ExerciseDB, com a licença não comercial. | Biblioteca: crédito "Dados de exercício por ExerciseDB, uso não comercial" (Sem decisão). | Resolvida. O crédito fica. O mock não mostra o crédito em nenhuma tela; proposta: ele aparece onde aparece o GIF, no passo a passo, como na V1. A licença é compatível com o app aberto e sem fins lucrativos. |
| 5. O importador de CSV segue o mock: só a primeira semana do arquivo entra, a fase fica com 4, 6 ou 8 semanas e o relatório avisa quantas semanas o arquivo tinha. | Protocolo: linha do CSV (Muda); conflito 1 (semanas do protocolo). | Resolvida para o CSV. Também fecha o conflito 1: o importador só faz sentido com a semana-tipo repetida na fase, e o aviso do `csv.js` diz "o v2 usa uma semana modelo repetida pela fase". As linhas "Sem decisão" que dependem de semanas com conteúdo próprio (número de semanas de 1 a 52, agrupamento em faixas, tipo de semana, confirmação ao diminuir semanas) passam a Sai. Se o PO quiser semanas com conteúdo próprio, a resposta 5 também precisa mudar. |

### Cruzamento

Legenda da coluna Situação: **coerente** (rascunho e mock dizem o mesmo), **resolvida** (havia divergência e já há fonte que decide), **proposta** (divergência com resolução proposta pela regra de negócio) e **pergunta** (vai para o PO, na lista do fim).

#### Execução da sessão

| Tema | Rascunho (regra atual) | Mock | Situação e resolução |
| --- | --- | --- | --- |
| Passos lineares | Calibração, preparo e séries válidas, exercício a exercício. | `buildSteps` em `regras.js`. | Coerente. O comentário do PO ("no mock o funcionamento não é o mesmo de reels da v1") foi atendido: o mock atual tem o reel (ver Reel). |
| Pergunta de carga e cartão de sugestão | Pergunta só na primeira vez do exercício naquele protocolo com aquela configuração de séries; depois, cartão com a Doom face, Ok e Ajustar. | `planFor` e `card` (CALIB): modos `wq`, `up`, `hold`, `under` e `back`; botões Ajustar e Ok!. | Coerente nos textos e botões. **Pergunta 1**: o que é "aquela configuração". O mock reaproveita o histórico quando o exercício tem o mesmo número de séries, todas normais (`lastOf`), sem olhar faixa, GER nem protocolo; o histórico é por exercício (`H[id]`), não por protocolo. |
| Reserva na pergunta | Cada nível usa a própria reserva (GER 8 pergunta 2 a 3). | `weightQuestion` usa `GER[n].rv` até o GER 9. | Coerente. |
| Campo de carga na primeira vez | Começa com uma carga padrão do equipamento, digitável, com mais e menos. | `DEFKG` (barra 40, Smith 30, anilhas 40, placas 30, halteres 10) e `stepperH`. | Coerente. Proposta: a #24 registra a tabela `DEFKG`, que o rascunho não traz. |
| Passo e arredondamento | 2,5 kg na barra, no Smith e nas placas; 5 kg nas máquinas de anilhas; 2 kg por mão nos halteres. | `EQ` e `roundEq`. | Coerente. Proposta: a #24 registra também o que só está no mock: a base da barra (20 kg) e do Smith (15 kg), anilhas no gympin acima da pilha, e polia usando o modelo da máquina de placas (lateral do mock). |
| Carga travada nas séries válidas | Só leitura, com cadeado. | `lockTip` em `sessao.js`. | Coerente. |
| Corrigir calibração passada | O peso novo vale para as séries que faltam. | `saveEdit` (CALIB). | Coerente. |
| Quantidade de preparo | 3, 2 ou 1 pelo estado do músculo; trava manual de 0 a 3. | `prepInfo`. | Coerente. |
| Músculo acessório | Muda: o mock deixa marcar vários. | Vários (`acc` em lista; chips no montador; `\|` no CSV). | Resolvida, contra o conflito 4. O próprio rascunho já adota vários na linha do CSV ("vários acessórios separados por barra vertical") e na contagem de meia série. A #24 escreve: vários acessórios por exercício, cada um contando só para os exercícios seguintes. |
| Rampa de preparo | 55/70/85, 60/80, 80. | `RAMPS`. | Coerente. |
| Carga do preparo | Arredonda pelo equipamento; editável; GER 7. | `prepKg`, `roundEq`, GER 7 no `typeLine`. | Coerente. |
| Carga do preparo gravada | Guarda a carga que a pessoa registrou. | `finish({kg, reps})` no PREP. | Coerente. |
| Corte do preparo | Pula quando a carga arredondada alcança a de trabalho e as repetições alcançam o mínimo; o primeiro nunca. | `shouldCut`. | Coerente. |
| Painel de GER | Doom face em todo cartão de série, menos na calibração. | `typeLine` e lateral do mock. | Coerente. |
| Registro do esforço | Depois de cada série normal, a pessoa registra quanto sobrou. | `gerSel` e `openGer` ("Quanto sobrou?"). | Coerente. |
| Campo de repetições | Digitável, com mais e menos; começa na meta de hoje ou no meio da faixa. | `stepperH('reps')` com `numIn`; `tg.reps` ou o meio da faixa. | Coerente. O comentário do PO ("isso não está no mock") foi atendido pelo mock atual. |
| Rest-pause | Dois blocos, 20 s de pausa que pode ser pulada; bloco só conclui com mais de zero. | Fases `b1`, `pause` (20 s, Pular) e `b2`; recusa bloco com zero. | Coerente. |
| Muscle round | Até 6 blocos de 4, 10 s entre eles, pode falhar em qualquer um; o sexto vai até a falha; sobe com os 6 completos e mais de 4 no sexto. | `TYPES.MUSCLE_ROUND`, cartão com fases `go`, `pause`, `fail` e `final`; `judge`. | Coerente, inclusive com o comentário do PO. |
| Tipos de série | Só normal, rest-pause e muscle round. | `TYPES`. | Coerente. |
| Descanso | Só antes de preparo ou série válida, nunca depois da calibração; valor do exercício, com padrão do protocolo. | `restBefore`; `rest` e `prepRest` por exercício. | Coerente. |
| Painel de descanso | Bloqueia o cartão; Pronto ou Pular; menos e mais 15 s; embaixo do reel. | `startRest`, `adjustRest`, `drawRest`. | Coerente. |
| Descanso por horário de término, alarme e vibração | Requisito do MVP; o mock só simula. | Contador (`setInterval`). | Coerente. O mock simula; a 0003 leva `timerManager.js` e `alarmSound.js` da V1. |
| Rodapé do descanso | Fora da tela de treino vira rodapé. | Comentário de `sessao.js`. | Coerente. |
| Reel | Volta, com arrasto, rolagem, setas, anterior e próximo, faixa para voltar ao atual; vizinhos menores; 3D dentro do cartão ativo. | `layoutReel` e os controles de arrasto e roda; `showStep3D` no cartão. | Coerente. |
| Dica de navegação do reel | Execução diz "na primeira vez aparece uma dica" (Mantém); Aderência diz que a dica Sai porque "a lista de cartões não precisa de dica". | O guia não tem dica do reel. | **Pergunta 2.** O motivo da saída ("lista de cartões") deixou de valer quando o reel voltou. |
| Fim da sessão | Termina sozinho na última série e vai para o resumo. | `completeStep` chama `finishSession(false)` no último passo. | Coerente. |
| Encerrar aqui | Salva o que foi feito e conta presença. | `endEarly` com toque duplo; `finishSession(true)` soma a semana e mostra "Presença registrada". | Coerente. Cancelar sem salvar continua no conflito 3 (**pergunta 3**); o mock só tem "Sair" na sessão de teste. |
| Sessão e cronômetro sobrevivem a recarregar | Requisito do MVP. | Simulado. | Coerente. |
| Passo a passo | GIF, músculos, equipamento e instruções em cada cartão; cadastro só por script. | Botão em cada cartão; `INFO` como exemplo. | Resolvida pela resposta 3 da 0003 (ver acima). |

#### Progressão, registro e histórico

| Tema | Rascunho (regra atual) | Mock | Situação e resolução |
| --- | --- | --- | --- |
| Carga sugerida | O app calcula e explica o motivo. | `suggestion` e `planFor`. | Coerente. |
| Quando sobe (normal) | Todas as séries no topo da faixa e GER registrado sem passar do alvo. | `judge`: `reps >= topo` e `ger <= alvo`. | Coerente. |
| Salto grande | Base fisiológica: quando o incremento passa de 10% da carga, só sobe com uma repetição além do topo. | `bigJump` e `targetOf`. | Coerente. |
| Incremento por equipamento | "Incremento conforme o equipamento", sem a tabela. | `INC`: barra 5, Smith 2,5, anilhas 5, placas 2,5, halteres 2. | Proposta: a #24 registra a tabela `INC`. Note que na barra o incremento (5 kg) é diferente do passo de arredondamento (2,5 kg). |
| Abaixo da faixa | Avisa e não reduz sozinho. | Modo `under`: mantém a carga e sugere ajustar se repetir. | Coerente. |
| Rest-pause e muscle round | Sobe com 10 no bloco 1; sobe com mais de 4 no sexto bloco. | `judge`. | Coerente. |
| Volta depois de pausa | De 15 a 27 dias mantém a carga e a meta vai ao começo da faixa; a partir de 28, 10% mais leve. | `planFor`: `back` com 15 dias, `cut` com 28. | Coerente. |
| Identificador estável e histórico completo | Requisito do MVP. | `H[id]` guarda só as 5 últimas cargas (`hist`). | Coerente. O limite de 5 é só da simulação; vale o histórico completo. |
| Registros por exercício, só acrescentados | Requisito do MVP. | Simulado. | Coerente. |
| Comparação por posição | Preparo 1 com preparo 1, série 2 com série 2. | `L.res[j]` por índice da série. | Coerente. |
| Aba Progresso | Carga por exercício e presença por semana. | `progresso.js` e `renderExProg`. | Coerente. Limpar o histórico: **pergunta 4**. |
| Histórico de sessões inteiro | Necessário para presença, meta e fase. | Simulado. | Coerente. |
| Unidade | Segue o equipamento; halteres em "kg cada". | `unitOf`. | Coerente. |

#### Protocolo e agenda

| Tema | Rascunho (regra atual) | Mock | Situação e resolução |
| --- | --- | --- | --- |
| Semanas do protocolo | Sem decisão (conflito 1). | Semana-tipo com fase de 4, 6 ou 8 semanas. | Resolvida pela resposta 5 da 0003 (ver acima). Número de semanas, agrupamento em faixas, tipo de semana e confirmação ao diminuir semanas saem. |
| Modo de agenda | Dia fixo ou sequência, escolhido ao criar o protocolo. | "Pulo aquele treino" e "Faço o que ficou para trás" em `plano-simples.js`; `SCHED_WHY` no montador. | Coerente. |
| Escolher qualquer treino | Sem decisão; o Hoje oferece só o próximo. | Só o próximo. | **Pergunta 5** (conflito 2). |
| Dia de descanso | Não inicia treino; guarda os exercícios. | `day.off`. | Coerente. |
| Descanso configurável | Por exercício, com padrão do protocolo. | Entre séries 60 a 180 s; preparo 30, 40 ou 60 s. No `csv.js`, um preparo de 90 s vindo do arquivo vira 40 s no padrão do protocolo, mas fica em 90 s no exercício, valor que o seletor do montador não oferece; nada disso entra no relatório. | Coerente, menos o preparo de 90 s: **pergunta 6** (conflito 10). Se o 90 não voltar, proposta: a importação troca o valor também no exercício e o relatório avisa. |
| Exercício sem séries | O mock exige pelo menos uma. | `plano-simples.js` não deixa tirar a última série (`n-`); o montador avançado deixa (`delset` sem limite). | **Pergunta 7** (conflito 8). Independente da resposta, o mock é incoerente entre os dois montadores. |
| Faixas de repetição | Só 4 a 6, 6 a 8, 8 a 10 e 10 a 12; faixa diferente vinda do CSV aparece como "Do protocolo". O conflito 9 fala em "cinco prontas". | `RRP` e `RR` com as quatro faixas e "Do protocolo"; mas o plano da fase 1, o histórico `H` e o padrão de `N()` usam 8 a 12, e o rascunho da fase 2 usa 5 a 9 e 6 a 10. | O "cinco" do conflito 9 é resto da V1; as faixas prontas são quatro. 8 a 12, 5 a 9 e 6 a 10 são dados de exemplo e, pela regra, só existem como "Do protocolo". Se a faixa personalizada volta para quem monta à mão: **pergunta 8** (conflito 9). |
| Série nova | Normal, GER 10, 8 a 10. | Montador avançado: trocar o tipo dá GER 10, 8 a 10 (coerente), mas adicionar exercício dá duas séries GER 10, 8 a 12. `plano-simples.js`: trocar o tipo dá GER 8, 8 a 10. | Proposta: vale a regra, normal, GER 10, 8 a 10, em todos os pontos de criação. Os modelos do montador simples continuam com os próprios padrões (base fisiológica), porque são modelos, não série nova. |
| Valores inválidos no CSV | A regra atual não diz; na V1, tipo inválido vira normal e GER inválido vira 10. | Tipo inválido vira normal com aviso; GER inválido vira 9; faixa inválida vira 8 a 12. | Proposta: GER e faixa inválidos viram o padrão da série nova (GER 10, 8 a 10), e o relatório avisa. Assim não nasce faixa fora das quatro prontas. |
| Reordenar | Arrasta pela alça e aceita setas. | `data-drag` e setas. | Coerente. |
| Remover sem confirmação | Igual no mock. | Montador avançado remove direto; o simples remove com "desfazer" por 6 s. | Coerente (desfazer não é confirmação). |
| Exercícios salvos | Sem decisão; o mock usa só a biblioteca. | Só a biblioteca. | **Pergunta 9** (conflito 11). |
| Busca na biblioteca | Por nome, com tradução de termos; o mock busca numa biblioteca de exemplo. | `LIB` de exemplo. | Coerente. A 0003 leva o dicionário da V1. |
| CSV | Toda conta, no Plano, próprio protocolo, relatório e confirmação, rascunho, neutralização de fórmulas. | `csv.js` e `plano-simples.js` ("Usar como rascunho"). | Resolvida pela resposta 5 da 0003. |
| Vincular exercícios à biblioteca nas configurações | Sem decisão. | Não tem; a importação já vincula por `biblioteca_id`, nome ou apelido. | **Pergunta 10.** |
| Limpar dia e descartar rascunho | Os dois com toque duplo. | `armed` em `plano-montador.js`. | Coerente. |
| Fase travada e semana de ajuste | Plano travado com a fase; ideias e rascunho; 7 dias de ajuste depois do primeiro treino; tudo começa no primeiro treino; dia fixo caindo em descanso deixa treinar. | `primeiro-acesso.js` (semana de ajuste, "Travado até a semana 7", ideias). | Coerente. |
| Nunca faltar duas vezes | Citada como regra, sem definição. | "Perdeu um treino, o próximo vira obrigatório." | **Pergunta 11.** |

#### Base fisiológica dos padrões

| Tema | Rascunho | Mock | Situação |
| --- | --- | --- | --- |
| Volume mínimo de 4 séries e meia série do acessório | Aviso abaixo de 4. | `bVol` e os alertas da revisão. | Coerente. |
| Modelos Superior e inferior, Empurrar, puxar e pernas | Frequências e durações descritas. | `TEMPLATES` em `plano-simples.js`. | Coerente. |
| Reserva por série | Primeira 2 a 3, última 1; isolado de série única até a falha. | `C2`, `M2`, `M3` com GER 8 e 9; `I1` com GER 10. | Coerente. |
| Faixas nos modelos | Compostos 6 a 8, stiff e médios 8 a 10, isolados 10 a 12. | `C2`, `Mc2`, `M2`. | Coerente. |
| Descanso padrão | 120 s compostos, 90 s isolados, 40 s preparo. | `rest:120`, `ISO = 90`, `prepRest:40`. | Coerente. |
| Mesma parte do corpo em dias seguidos | Nunca, nem de domingo para segunda. | `restConflicts`. | Coerente. |
| Dia acima de 60 minutos | Alerta prático. | Alerta na revisão. | Coerente. |

#### Aderência e gamificação

| Tema | Rascunho (regra atual) | Mock | Situação e resolução |
| --- | --- | --- | --- |
| Conquistas por número de treinos | Primeira missão, Habitué, Veterano, Doom slayer. | `estrutura.html`. | Coerente. |
| Sem desculpa e Hellwalker | O mock redefiniu Sem desculpa como 2 semanas na meta e não mostra Hellwalker; não decidido. | Sem desculpa: "2 semanas seguidas na meta". | **Pergunta 12** (conflito 5). |
| Rip and tear | O mock redefiniu como 3 cargas subindo na mesma sessão; não decidido. | "3 cargas sobem na mesma sessão". | **Pergunta 12** (conflito 6). |
| Sequência de dias | Sai; conta presença contra a meta. | Meta semanal em `renderSlots`. | Coerente. |
| Encerrar conta presença | Sim. | `finishSession(true)`. | Coerente. Proposta: encerrar antes não desbloqueia conquista nova no resumo, como o mock faz (`achRow` escondido quando `early`); a #24 confirma no texto. |
| Conquista no resumo | Aparece no resumo. | `achRow`. | Coerente. |
| Popups bravo e feliz | Sem decisão; o mock usa texto no cartão. | Cartão de sugestão com cabeçalho e face ("Abaixo da faixa", "Você superou seus limites"). | **Pergunta 13** (conflito 7). |
| Tour do Doomguy | Sem tutorial de telas; balões; uma vez em cada momento novo. | `guia.js` e `primeiro-acesso.js`. | Coerente. |

#### Biblioteca, contas, infraestrutura e código fora do app

| Tema | Rascunho (regra atual) | Mock ou 0003 | Situação e resolução |
| --- | --- | --- | --- |
| Campos da biblioteca, leitura para todos | Mantém. | Base da biblioteca do mock. | Coerente. |
| Cadastro, aba Exercícios, papel de admin | Script com a chave de serviço; sem aba; sem papel. | Resposta 3 da 0003. | Resolvida. |
| Busca paginada de 30 em 30 com tradução | Requisito do MVP. | 0003 adapta `exerciseSource.js` e leva o dicionário. | Coerente. |
| Filtro neon | Requisito do MVP. | Resposta 1 da 0003. | Resolvida. |
| Categoria de equipamento | Cinco categorias e tamanho da pilha. | `EQ`, `LIB.max`; mapeamento na #43. | Resolvida pela resposta 2. |
| Crédito da ExerciseDB | Sem decisão. | Resposta 4 da 0003. | Resolvida. |
| Cadastro, login, recuperação de senha | Mantém. | `primeiro-acesso.js`. | Coerente. |
| Papéis, treinador, admin, "Visualizando", primeiro admin | Saem. | Lateral do mock ("Fora do MVP"); 0003. | Coerente. |
| Botão de feedback | Sem decisão. | O mock não tem; a 0003 descarta `send-feedback` e diz que, se o botão ficar, a função é reescrita. | **Pergunta 14.** |
| Sair limpa os dados locais | Mantém. | Não simulado. | Coerente. |
| Gravação local com fila, registros só acrescentados, falha visível | Requisito do MVP. | Não simulado; 0003 descarta o `useStore.js`. | Coerente. |
| Aviso de fim de descanso por push | Forma de entrega em aberto. | 0003: spike própria. | Não é pergunta de regra; depende da spike de notificação. |
| PWA, descanso retomado, tela de erro por aba | Mantém. | Não simulado; base do PWA na #36. | Coerente. |
| Dieta, cronômetro avulso, cartão de registro antigo, cabeçalho que se esconde | Fora do MVP ou substituídos. | Ausentes do mock. | Coerente. |
| Observações por exercício | Sem decisão. | Ausentes do mock. | **Pergunta 4** (junto com limpar o histórico). |

### Conflitos do rascunho

| Conflito | Situação |
| --- | --- |
| 1. Semanas do protocolo | Resolvido pela resposta 5 da 0003: semana-tipo repetida na fase. |
| 2. Escolher o treino | Pergunta 5. |
| 3. Fim da sessão (cancelar sem salvar) | Pergunta 3. |
| 4. Músculo acessório | Resolvido pelo próprio rascunho (linha do CSV e contagem de meia série) e pelo mock: vários. |
| 5. Sem desculpa e Hellwalker | Pergunta 12. |
| 6. Rip and tear | Pergunta 12. |
| 7. Popups de bravo e feliz | Pergunta 13. |
| 8. Exercício sem séries | Pergunta 7. |
| 9. Faixa personalizada | Pergunta 8. As prontas são quatro, não cinco. |
| 10. Descanso de preparo de 90 s | Pergunta 6. |
| 11. Exercícios salvos | Pergunta 9. |
| 12. Importar e exportar CSV | Resolvido pela resposta 5 da 0003; o painel admin não volta (resposta 3). |

## Perguntas ao PO

Cada pergunta traz uma sugestão, para facilitar a resposta. A sugestão não vale como regra até o PO responder.

1. **Primeira vez do exercício.** A pergunta de carga aparece "na primeira vez do exercício naquele protocolo com aquela configuração de séries". O que conta como a mesma configuração: o número de séries, os tipos, as faixas, o GER? E o histórico de um exercício vale entre protocolos diferentes? O mock compara só o número de séries normais e guarda o histórico por exercício, não por protocolo. Sugestão: mesmo exercício com a mesma lista de tipos de série, valendo entre protocolos.
2. **Dica de navegação do reel.** Com o reel de volta, a dica da primeira vez volta (como na V1) ou sai? O mock não tem a dica. Sugestão: o tour do Doomguy mostra o reel uma vez, sem dica separada.
3. **Cancelar sem salvar.** Além de "Encerrar aqui", existe um jeito de descartar a sessão inteira sem salvar e sem contar presença? O mock não tem. Sugestão: não existe; quem abriu por engano encerra antes da primeira série válida, e isso não conta presença.
4. **Limpar o histórico e observações por exercício.** A pessoa pode apagar todo o histórico, como na V1? O campo de observações por exercício volta? O mock não tem nenhum dos dois. Sugestão: os dois ficam fora do MVP.
5. **Escolher o treino.** Além do próximo treino oferecido pelo modo de agenda, a pessoa pode escolher outro treino da semana para fazer hoje? Sugestão: pode, num menu discreto, sem mudar a regra de presença.
6. **Descanso de preparo de 90 s.** A opção volta? Hoje o importador aceita 90 s no exercício sem avisar, e o montador não mostra esse valor. Sugestão: não volta; a importação troca para o valor mais próximo e o relatório avisa.
7. **Exercício sem séries.** Um exercício pode ficar sem séries no rascunho do protocolo? O montador simples não deixa e o avançado deixa. Sugestão: não pode; os dois montadores bloqueiam a remoção da última série.
8. **Faixa personalizada.** Quem monta à mão pode criar uma faixa fora das quatro prontas, ou ela só existe quando vem do CSV, como "Do protocolo"? Sugestão: só pelo CSV.
9. **Exercícios salvos.** Além da biblioteca geral, a pessoa tem uma lista pessoal de exercícios? Sugestão: não no MVP.
10. **Vincular exercícios à biblioteca.** O botão da V1 que vincula os exercícios do protocolo à biblioteca volta? A importação do v2 já vincula por id, nome ou apelido. Sugestão: não volta.
11. **Nunca faltar duas vezes.** O mock diz "perdeu um treino, o próximo vira obrigatório". O que acontece quando a pessoa falta de novo: só um aviso, ou algo muda na fase ou na meta? Sugestão: só aviso e a Doom face, sem punição, coerente com premiar presença sem punir falta.
12. **Sem desculpa, Hellwalker e Rip and tear.** Ficam as definições do mock (Sem desculpa: 2 semanas seguidas na meta; Rip and tear: 3 cargas sobem na mesma sessão)? Hellwalker sai ou ganha uma definição por presença? Sugestão: ficam as do mock, e Hellwalker vira, por exemplo, uma fase inteira na meta.
13. **Popups de bravo e feliz.** Voltam como na V1, com as frases duras, ou fica o texto no cartão de sugestão, como no mock? Sugestão: fica o cartão do mock.
14. **Botão de feedback.** Vai para todas as contas ou sai do MVP? Se ficar, a função é reescrita sem chave de serviço e sem levar token ou dado de outra pessoa. Sugestão: sai do MVP e vira issue própria.

## Respostas do PO

Respondidas pelo PO em 2026-10-25. Valem como regra de negócio e são a fonte da #24 para cada ponto abaixo.

1. **Primeira vez do exercício:** vale a sugestão. Conta como a mesma configuração o mesmo exercício com a mesma lista de tipos de série, e o histórico vale entre protocolos diferentes.
2. **Dica de navegação do reel:** vale a sugestão. O tour do Doomguy mostra o reel uma vez, sem dica separada.
3. **Cancelar sem salvar:** diverge da sugestão. Existe um botão de cancelar o treino, ao lado do botão de finalizar, que pede confirmação. Cancelar descarta a sessão sem salvar nada e sem contar presença, para quem abriu um treino por engano ou só para testar. O mock ainda não tem esse botão nem o modal de confirmação; o desenho e a regra detalhada ficam na issue própria do cancelamento.
4. **Limpar o histórico e observações por exercício:** os dois ficam fora do MVP.
5. **Escolher o treino:** vale a sugestão. A pessoa pode escolher outro treino da semana num menu discreto, sem mudar a regra de presença.
6. **Descanso de preparo de 90 s:** vale a sugestão. Não volta; a importação troca para o valor mais próximo e o relatório da importação avisa.
7. **Exercício sem séries:** vale a sugestão. Não pode; os dois montadores bloqueiam a remoção da última série.
8. **Faixa personalizada:** vale a sugestão. Só existe quando vem do CSV, como "Do protocolo".
9. **Exercícios salvos:** vale a sugestão. Não há lista pessoal no MVP.
10. **Vincular exercícios à biblioteca:** o botão da V1 não volta.
11. **Faltar de novo:** vale a sugestão. Só o aviso e a reação da Doom face, sem punição na fase ou na meta.
12. **Conquistas:** vale a sugestão. Ficam as definições do mock (Sem desculpa: 2 semanas seguidas na meta; Rip and tear: 3 cargas sobem na mesma sessão), e o Hellwalker passa a ser uma fase inteira na meta.
13. **Popups de bravo e feliz:** fica como no mock, com o texto no cartão de sugestão.
14. **Botão de feedback:** sai do MVP e vira issue futura.

## Consequências

- Bom, porque a #24 pode escrever já a maior parte das regras, que estão coerentes ou resolvidas, e já tem as respostas do PO para as 14 perguntas.
- Bom, porque os pontos em que o rascunho ficou desatualizado (painel de admin, crédito da ExerciseDB, "cinco faixas", conflitos 1, 4 e 12) não passam para `regras-de-negocio.md`.
- Ruim, porque o mock continua com detalhes que contradizem a regra: o padrão da série nova, a faixa 8 a 12 nos exemplos, a remoção da última série no montador avançado, o GER 9 e o preparo de 90 s do importador e o texto da lateral sobre o cadastro da biblioteca. Quem ler o mock como regra pode copiar esses detalhes. Ficam como sugestão de issue para corrigir o mock.

## Como conferir

- Toda linha das seis tabelas do rascunho e os doze conflitos aparecem no cruzamento acima.
- Nenhuma das cinco respostas do PO da 0003 aparece em Perguntas ao PO.
- A #24 cita este registro para cada regra que vier de uma resolução proposta, e não escreve regra para as perguntas ainda sem resposta.

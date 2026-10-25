> **Rascunho, a ser validado pela [#25](https://github.com/IgorOlive11/overload/issues/25).** Este arquivo traz, sem reescrita, o documento "Overload: regras de negócio" (Claude Docs, revisão 768, de 24/10/2026). As regras ainda não foram validadas e **não valem como regra de negócio** até a #25 aprová-las. O conteúdo oficial, depois de validado, fica nos demais arquivos de `docs/produto/`.

# Overload: regras de negócio

2026-10-20 · @Igor

## Como ler

Este documento lista as regras de negócio que encontrei lendo todo o código da v1 (o repositório ultima-weapon) e compara cada uma com as regras atuais. Regras atuais são as decisões tomadas na conversa e o que está no mock publicado em 20 de outubro.

Cada regra da v1 recebe um status:

- **Mantém**: a regra atual é igual à da v1.
- **Muda**: a regra existe nas duas versões, mas a atual é diferente. É aqui que a v1 se sobrepõe à regra atual.
- **Sai**: existe na v1 e não existe mais.
- **Sem decisão**: existe na v1 e ainda não foi decidido se fica no MVP.

Regras novas, que não existem na v1, só aparecem quando cruzam com uma regra da v1. A última seção junta os conflitos que ainda pedem decisão.

## Execução da sessão

A maior parte da execução da v1 se mantém. As mudanças estão no arredondamento por equipamento, no registro do esforço, nos tipos de série, no descanso por exercício e em como a sessão termina.

| Regra na v1 | Status | Regra atual | Comentário para correção |
| --- | --- | --- | --- |
| A sessão vira uma lista linear de passos, exercício a exercício, na ordem do protocolo: calibração do peso, séries de preparo e séries válidas. | Mantém | Igual no mock, agora dentro do reel da v1. | No mock, o funcionamento não é no mesmo de "reels" da v1 |
| A calibração faz uma pergunta conforme a primeira série do exercício. Na série normal de GER 7 a 9 a pergunta é sempre "deixando 1 rep na reserva", mesmo no GER 7 e no GER 8. O GER 10 pergunta "indo até a falha" e do GER 11 para cima pergunta "além da falha". Os outros tipos têm pergunta própria. | Muda | A pergunta de carga só aparece na primeira vez do exercício naquele protocolo com aquela configuração de séries, usando a reserva de cada nível (GER 8 pergunta 2 a 3 na reserva). Da segunda vez em diante aparece um cartão de sugestão com a Doom face. Se a carga se manteve, ele mostra o que a pessoa fez e pede uma repetição a mais com a mesma carga. Se houve progressão, ele diz que ela superou os limites, mostra a carga nova da progressão automática e a faixa inteira como meta. O botão é Ok, e Ajustar a carga abre o campo. | O cenário ideal, é que a wheigh question apareça por padrão na primeira vez fazendo aquele exercicio naquele protocolo, com aquelas variaveis. se for a segunda, e tiver somente mantendo a carga, e fazendo a progressão de repetições, o app deve mostrar um card com o que é sugerido de carga (Você fez X reps da ultima vez nesse exercicio, com Y carga, tente fazer (X+1) repetições com a mesma carga hoje. caso haja progressão em relação ao último treino, aí a wheight question vira uma pergunta de progressão "você superou seus limites no ultimo treino, e realizou X reps com Y carga, hoje, tente fazer (faixa de reps) reps com Z de carga, e um botão de "Ok!" abaixo, seguindo o calculo automatico de progressão. |
| O campo de peso da calibração começa vazio e o botão só libera com peso maior que zero. O cartão mostra o último registro com data, preparos e até 3 séries. | Muda | Na primeira vez o campo começa com uma carga padrão do equipamento e é digitável, com mais e menos ao lado. No cartão de sugestão a carga já vem calculada e o campo só aparece em Ajustar a carga. | Segue adaptações de acordo com a nova regra acima |
| Os botões de mais e menos andam 2,5 kg e a carga é sempre arredondada para 2,5 kg, em qualquer equipamento. | Muda | O passo e o arredondamento dependem do equipamento: 2,5 kg na barra, no Smith e nas placas, 5 kg nas máquinas de anilhas e 2 kg por mão nos halteres. |  |
| Nas séries válidas a carga aparece só para leitura. | Mantém | Igual no mock, com um cadeado que explica onde corrigir. |  |
| A calibração de um exercício já passado pode ser corrigida. O peso novo vale para as séries que ainda faltam, sem refazer as feitas. | Mantém | Igual no mock. |  |
| A quantidade de preparo segue o estado do músculo: 3 quando estreia na sessão, 2 quando já foi acessório, 1 quando já foi principal. Ter sido principal vence ter sido acessório. O automático nunca dá zero; só a trava manual, de 0 a 3, chega a zero. | Mantém | Igual no mock. |  |
| Cada exercício tem no máximo um músculo acessório, e ele só conta para os exercícios seguintes. | Muda | O mock deixa marcar vários acessórios por exercício. |  |
| A rampa de preparo usa 55, 70 e 85% com 3 séries, 60 e 80% com 2 e 80% com 1, com repetições descendo de 8 a 10 até 4 a 6. | Mantém | Igual no mock. |  |
| A carga do preparo é sugerida arredondando para múltiplos de 5 kg, pode ser editada no cartão e o app registra as repetições feitas. O preparo é sempre GER 7. | Muda | O arredondamento do preparo segue o equipamento, como a carga de trabalho. |  |
| Ao gravar o histórico, a v1 recalcula a carga do preparo a partir do peso de trabalho e descarta a carga que a pessoa editou no cartão. | Muda | É um defeito da v1. O mock guarda a carga que a pessoa registrou. |  |
| Um preparo é pulado quando a carga dele, arredondada, já é igual ou maior que a de trabalho e as repetições dele alcançam o mínimo da série válida. O primeiro preparo nunca é pulado, e tipos sem faixa de repetições nunca têm corte. | Mantém | Igual no mock. |  |
| Todo cartão de série mostra o painel de GER com Doom face, rótulo, nome e repetições na reserva. A calibração não tem face. Preparo é verde e série válida é vermelha. | Mantém | Igual no mock. |  |
| O app registra só repetições e carga. O esforço real não é registrado. | Muda | Depois de cada série normal a pessoa registra quanto sobrou, com face e texto de cada GER, e isso entra na progressão. |  |
| Na série normal o campo de repetições começa vazio. | Muda | O campo é digitável, como na v1, com mais e menos ao lado. Ele começa na meta de hoje que veio da sugestão, ou no meio da faixa quando não há histórico. | o campo deve ser digitavel, assim como na V1, isso não está no mock |
| Rest-pause: carga para cerca de 8 repetições, bloco 1 até a falha, pausa automática de 20 segundos que pode ser pulada e bloco 2 até a falha. Um bloco só é concluído com mais de zero repetições. A descrição do tipo fala em três blocos, mas o código encerra depois do segundo. | Mantém | Dois blocos, como no código, por decisão sua. |  |
| Muscle round: até 12 blocos de 4 repetições com 10 segundos entre eles, até falhar uma vez. Registra os blocos completos e as repetições do bloco da falha. O campo de repetições de cada bloco existe na tela, mas não é salvo. | Muda | No máximo 6 blocos de 4 repetições, com 10 segundos entre eles. A pessoa pode falhar em qualquer bloco, e a série termina ali com as repetições daquele bloco. O sexto vai até a falha. A carga só sobe quando os 6 blocos saem completos e o sexto passa de 4 repetições. | nem sempre um mucle round vai ter todos os blocos completos, a regra é que quando todos forem completos, e o sexto estourar a faixa, aí progride, mas ainda deve ser permitido falahr nos blocos anteriores |
| Widowmaker e pulse são tipos de série com cartão próprio. | Sai | Ficam só normal, rest-pause e muscle round. |  |
| O descanso só roda antes de um preparo ou de uma série válida, nunca depois da calibração, e o valor vem do dia: um para séries e outro para preparo. | Muda | Mesma regra de quando roda, mas o valor vem do exercício, com um padrão do protocolo. |  |
| Durante o descanso o cartão atual fica bloqueado e só libera quando a pessoa toca em Pronto ou Pular. Há ajuste de menos 15 e mais 15 segundos, e o painel pulsa em verde quando o tempo acaba. | Mantém | Igual no mock, embaixo do reel, sem cobrir a tela. |  |
| O descanso é calculado pelo horário de término e sobrevive a recarregar a página. No fim toca um alarme de duas notas e vibra quando o aparelho permite. | Mantém | Requisito do MVP. O mock só simula com um contador. |  |
| Fora da tela de treino, o descanso vira um rodapé visível no app inteiro. | Mantém | Igual no mock. |  |
| Os passos ficam num trilho vertical (o reel) navegado por arrasto, rolagem ou setas. Passos passados podem ser corrigidos e os futuros ficam bloqueados. Na primeira vez aparece uma dica de navegação. | Mantém | O reel volta, com arrasto, rolagem, setas do teclado, botões de anterior e próximo e uma faixa para voltar ao passo atual. Os vizinhos aparecem menores e apagados, e o 3D do equipamento fica dentro do cartão ativo. Passos passados podem ser corrigidos e os futuros ficam bloqueados. | o reel volta, adaptando o que já tem no mock atual, o 3d dos exercicios vem dentro do card do reel |
| O botão de concluir só aparece no último passo e pede confirmação. Depois vem a tela de treino concluído com a duração, e os registros só são gravados ao tocar em Fechar. | Muda | No mock o treino termina sozinho na última série e vai direto para o resumo. |  |
| Cancelar o treino descarta a sessão inteira, sem salvar nada, depois de uma confirmação. | Muda | "Encerrar aqui" salva o que foi feito e conta presença. |  |
| A sessão ativa e o cronômetro geral sobrevivem a recarregar a página, porque o tempo é calculado a partir do horário de início. | Mantém | Requisito do MVP. |  |
| Cada cartão tem um botão para ver o GIF e as instruções do exercício quando ele está vinculado à biblioteca. | Mantém | Cada cartão tem o botão de passo a passo, com o GIF, os músculos, o equipamento e as instruções. O cadastro da biblioteca sai do app e passa a ser feito por um script com a chave de serviço, rodado fora do app, porque o v2 não tem papel de admin. | O passo a passo de um exercicio ainda deve ser possivel de ver, com o gif, o cadastro dos exercicios que muda, e irá somente para um paineld e admin com rota separada e interface web diferente, mas isso entra lá na frente no roadmap |

## Progressão, registro e histórico

A v1 não tem progressão calculada: ela só avisa, e a pessoa decide a carga. O histórico é o ponto que mais se sobrepõe às regras atuais, porque guarda pouco e se perde quando o protocolo muda.

| Regra na v1 | Status | Regra atual |
| --- | --- | --- |
| O app não sugere carga. A pessoa digita o peso na calibração olhando o último registro. | Muda | O app calcula a carga sugerida e explica o motivo. |
| O aviso de subir aparece quando a série passou do topo da faixa, por exemplo 13 numa faixa de 8 a 12. | Muda | A carga sobe quando todas as séries chegam ao topo da faixa e o GER registrado não passa do alvo. |
| O aviso de reduzir aparece quando a série ficou abaixo do mínimo da faixa. | Mantém | O mock mantém o aviso e não reduz a carga sozinho. |
| Só séries normais entram nos avisos. No rest-pause a regra "10 a 11 no bloco 1, progride" é só um texto no cartão. | Muda | Rest-pause sobe com 10 repetições no bloco 1 e muscle round sobe com mais de 4 no sexto bloco, as duas calculadas pelo app. |
| O histórico de exercício é chaveado pelo nome em maiúsculas e guarda só a última sessão. Renomear o exercício perde o histórico. | Muda | Requisito do MVP: exercício com identificador estável e histórico completo. |
| Os registros por sessão são chaveados pela posição (semana, dia e índice do exercício) e guardam as 10 últimas entradas. Reordenar ou trocar um exercício liga o registro ao exercício errado. | Muda | Mesmo requisito: registros só acrescentados e ligados ao exercício, nunca à posição. |
| O último registro é comparado por posição: o preparo 1 de hoje com o preparo 1 da última vez, a série 2 com a série 2. | Mantém | Igual no mock. |
| A tela de histórico agrupa por semana e dia, mostra até as 3 últimas entradas de cada exercício e a duração da sessão mais recente daquele dia. Tem um botão de limpar todo o histórico com confirmação. | Muda | A aba Progresso mostra a carga por exercício ao longo das sessões e a presença por semana. Limpar o histórico está sem decisão. |
| A lista de sessões concluídas guarda só as 50 últimas, com duração. | Muda | Presença, meta semanal e critério de fase precisam do histórico de sessões inteiro. |
| Toda carga é exibida arredondada para 2,5 kg, com a unidade "KG". | Muda | A unidade segue o equipamento, e halteres mostram "kg cada". |

## Protocolo e agenda

A v1 trata o protocolo como uma grade de semanas por dias da semana, em que cada semana pode ter conteúdo diferente. O mock monta uma semana-tipo que se repete durante a fase, e por isso várias regras daqui ficam sem decisão.

| Regra na v1 | Status | Regra atual |
| --- | --- | --- |
| O protocolo tem um número de semanas (8 por padrão, de 1 a 52), cada uma com os 7 dias, de segunda a domingo, e cada semana pode ter treinos diferentes. | Sem decisão | O mock monta uma semana-tipo e a duração fica na fase da camada de aderência. |
| A semana atual é calculada pela data de início, que a pessoa configura. Passado o total de semanas, o app fica preso na última. O dia é o dia da semana de hoje. | Muda | O modo de agenda é escolhido ao criar o protocolo: dia da semana fixo, ou sequência, em que o app oferece o treino pendente quando a pessoa falta. |
| A pessoa pode escolher qualquer semana e qualquer dia e iniciar aquele treino. | Sem decisão | A tela Hoje oferece só o próximo treino. |
| Um dia pode ser marcado como descanso. Dia de descanso não inicia treino, e os exercícios dele ficam guardados. | Mantém | Igual no mock. |
| O descanso é configurado por dia: entre séries de 60 a 180 segundos e de preparo com 30, 40, 60 ou 90 segundos. | Muda | Configurado por exercício, com um padrão do protocolo. O mock não oferece a opção de 90 segundos para preparo. |
| Semanas podem ser agrupadas numa faixa: editar uma semana da faixa copia o conteúdo para as outras, e desagrupar mantém o conteúdo atual. | Sem decisão | O mock não tem. |
| Cada semana tem um tipo (progressão, base, deload, revolume), que é só um rótulo e não muda nenhuma regra. | Sem decisão | O mock não tem. |
| O exercício tem nome, músculo, acessório, apelido em português, vínculo com a biblioteca e trava de preparo. Pode ficar sem nenhuma série. | Muda | O mock exige pelo menos uma série. |
| A série tem tipo, GER e faixa. Só a normal escolhe o GER (7 a 13) e a faixa, com cinco opções prontas ou uma faixa personalizada. A série nova vem como normal, GER 10, 8 a 12. | Muda | Só três tipos, com as faixas 4 a 6, 6 a 8, 8 a 10 e 10 a 12. Faixa diferente vinda do CSV aparece como "Do protocolo". A série nova vem como normal, GER 10, 8 a 10. |
| Exercícios e séries são reordenados arrastando. No toque é preciso segurar 200 milissegundos antes de arrastar. | Mantém | O mock arrasta pela alça e também aceita as setas do teclado. |
| Remover exercício ou série não pede confirmação. | Mantém | Igual no mock. |
| A pessoa tem uma lista de exercícios salvos, sem repetir nome. Salvar vem ligado ao adicionar um exercício, e a importação de CSV também salva. | Sem decisão | O mock usa só a biblioteca geral. |
| Ao digitar 3 letras do nome, o app busca na biblioteca com tradução de termos de academia do português para o inglês. O vínculo traz músculo e apelido; sem vínculo, o músculo é cadastrado à mão. | Mantém | O mock busca por nome, músculo e equipamento numa biblioteca de exemplo. |
| O protocolo pode ser baixado e importado em CSV, com uma linha por série. Importar substitui o protocolo inteiro sem confirmação. Tipo inválido vira normal, GER inválido vira 10, e colunas de versões antigas são aceitas. | Muda | Volta para toda conta, no Plano, e vale só para o próprio protocolo. Mesmas colunas da v1, uma linha por série, com agenda e fase\_semanas no fim e vários acessórios separados por barra vertical. Importar mostra um relatório com semanas além da primeira, tipos que saíram e exercícios sem vínculo na biblioteca, e só substitui o protocolo depois de confirmar, como rascunho. Exportar neutraliza células que começam com =, +, - ou @, para o Excel não executar fórmulas. É assim que você monta protocolos para quem depende de você: manda o arquivo, e a pessoa importa na própria conta. |
| Nas configurações, um botão vincula os exercícios do protocolo à biblioteca, só quando acha um nome com confiança. | Sem decisão | O mock não tem. |
| Diminuir o total de semanas pede confirmação quando apagaria semanas com treino. | Sem decisão | Depende de as semanas continuarem existindo. |
| Não há como limpar um dia nem descartar o protocolo; só a importação substitui tudo. | Muda | O mock tem "Limpar este dia" e "Descartar rascunho", os dois com toque duplo para confirmar. |
| O protocolo pode ser editado a qualquer momento. | Muda | Com a fase da camada de aderência ligada, o plano fica travado e as mudanças viram ideias e rascunho. No primeiro protocolo da conta há uma semana de ajuste: nos 7 dias depois do primeiro treino o plano fica editável, e só depois a fase trava. A conta pode ser criada dias antes: a semana de ajuste, a meta semanal e a regra de nunca faltar duas vezes só começam a contar no primeiro treino. No dia fixo, se o cadastro cair num dia de descanso, o Hoje mostra o próximo treino e deixa treinar mesmo assim. |

## Base fisiológica dos padrões

Os padrões do montador seguem a evidência atual sobre treino de força. O volume é baixo de propósito: garante o mínimo de 4 séries semanais por grupo muscular e troca parte do ganho máximo por treinos curtos, mais fáceis de manter.

| Padrão | Regra atual | Evidência |
| --- | --- | --- |
| Volume semanal | Cada grupo muscular soma pelo menos 4 séries por semana. O montador avisa quando um grupo fica abaixo disso. | 4 séries semanais é o mínimo recomendado por [Iversen e colegas (2021)](https://lida.sport-iat.de/ta/Record/4073965). Mais séries dão mais massa muscular, com retorno decrescente ([Pelland e colegas, 2024, pré-publicação](https://sportrxiv.org/index.php/server/preprint/view/460)). |
| Contagem de séries | A série em que o músculo é só acessório conta como meia série. | A contagem fracionada foi a que melhor explicou o ganho de massa muscular em [Pelland e colegas (2024)](https://sportrxiv.org/index.php/server/preprint/view/460). |
| Modelo Superior e inferior | 4 dias, cada parte do corpo 2 vezes por semana. Todos os grupos fecham 4 séries semanais, e os dias levam de 29 a 41 minutos. | Treinar cada músculo 2 vezes por semana deu mais massa muscular do que 1 vez em [Schoenfeld e colegas (2016)](https://lida.sport-iat.de/ta/Record/4042947). |
| Modelo Empurrar, puxar e pernas | 3 dias, cada músculo 1 vez por semana, com séries a mais para todos os grupos fecharem 4 séries semanais. Os dias levam de 29 a 43 minutos. Em 6 dias, o ciclo roda 2 vezes. | Com o volume igualado, a frequência quase não muda a massa muscular, mas ajuda na força ([Pelland e colegas, 2024](https://sportrxiv.org/index.php/server/preprint/view/460)). |
| Reserva por série | A primeira série deixa 2 a 3 repetições na reserva e a última 1. Isolados de máquina com série única vão até a falha com técnica perfeita. | A massa muscular cresce quanto mais perto da falha ([Robinson e colegas, 2024](https://rke.abertay.ac.uk/en/publications/exploring-the-dose-response-relationship-between-estimated-resist/)). As pessoas erram a estimativa em cerca de 1 repetição para menos ([Halperin e colegas](https://sportrxiv.org/index.php/server/preprint/view/67)). |
| Faixa de repetições | As opções são as faixas que todo mundo conhece: 4 a 6, 6 a 8, 8 a 10 e 10 a 12. Nos modelos, compostos pesados usam 6 a 8, stiff e compostos médios 8 a 10 e isolados 10 a 12. | A massa muscular cresce de forma parecida entre faixas diferentes quando a série chega perto da falha, então a escolha segue o costume. A faixa mais alta no stiff dá margem para aprender a técnica, um julgamento prático, não um achado de estudo sobre lesão. |
| Descanso | 2 minutos nos compostos, 90 segundos nos isolados e 40 segundos entre séries de preparo. | Descansar mais de 60 segundos teve um pequeno benefício, sem ganho claro acima de 90 ([Singer e colegas, 2024](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/text)). A ACSM recomenda 1 a 2 minutos para iniciantes ([ACSM, 2009](https://sfu.ca/~ryand/kin343/ACSMresistance.pdf)). |
| Preparo | 3, 2, 1 ou 0 séries do próprio exercício, conforme o músculo já tenha trabalhado na sessão. | Iversen e colegas recomendam limitar o aquecimento a séries do próprio exercício. A revisão de [Ribeiro e colegas (2021)](https://revistas.rcaap.pt/motricidade/article/view/21143) achou resultados inconsistentes sobre aquecimento em geral. |
| Progressão | A carga sobe quando todas as séries chegam ao topo da faixa, com incremento conforme o equipamento. Quando o incremento passa de 10% da carga, como num halter de 10 kg indo para 12, a carga só sobe com uma repetição além do topo. | Com faixas de 2 repetições, um salto grande derruba a pessoa para baixo da faixa logo depois de subir. Progredir por repetições ou por carga deu resultados parecidos ([Plotkin e colegas, 2022](https://peerj.com/articles/14142)). A ACSM recomenda aumentos de 2 a 10%. |
| Volta depois de pausa | De 15 a 27 dias sem treinar, a carga continua a mesma e a meta vai para o começo da faixa. A partir de 28 dias, a carga vem 10% mais leve. | A força máxima fica praticamente preservada até cerca de 4 semanas parado em adultos jovens ([Bosquet e colegas, 2013, resumido pela Stronger by Science](https://www.strongerbyscience.com/detraining/)). |
| Rest-pause | Bloco 1 até a falha, 20 segundos de pausa e bloco 2 até a falha. | Com volume igualado, deu massa muscular parecida com a do treino tradicional e mais ganho no agachamento ([Enes e colegas, 2021](https://getfitcraft.com/science/rest-pause-training-research)). |
| Muscle round | Até 6 blocos de 4 repetições com 10 segundos de pausa. | Não tem estudo próprio. Funciona por analogia com o rest-pause e as séries em cluster. |
| Mesma parte do corpo | Nunca em dois dias seguidos, nem na passagem de domingo para segunda. | A ACSM recomenda 2 a 3 dias por semana, não consecutivos, para iniciantes. |

O alerta de dia acima de 60 minutos é uma regra prática de aderência, não um limite fisiológico.

## Aderência e gamificação

A v1 não tem meta semanal, regra de falta nem fase. A gamificação dela é por sequência de dias seguidos, o oposto do princípio atual de premiar presença sem punir falta. O mock mudou a definição de duas conquistas sem que isso tivesse sido decidido.

| Regra na v1 | Status | Regra atual |
| --- | --- | --- |
| Conquistas por número de treinos: Primeira missão com 1, Habitué com 5, Veterano com 10 e Doom slayer com 30. | Mantém | Igual no mock. |
| Sem desculpa é desbloqueada com 3 dias seguidos de treino e Hellwalker com 7 dias seguidos. | Muda | O mock redefiniu Sem desculpa como 2 semanas seguidas na meta e não mostra Hellwalker. A mudança não foi decidida. |
| Rip and tear é desbloqueada quando todas as séries normais de todos os exercícios de um treino passam do topo da faixa. | Muda | O mock redefiniu como 3 cargas que sobem na mesma sessão. A mudança não foi decidida. |
| A sequência de dias soma 1 quando a pessoa treinou ontem e volta para 1 quando pulou um dia. Treinar duas vezes no mesmo dia não conta. A sequência aparece nas configurações. | Muda | A regra atual não usa sequência de dias; conta presença contra a meta da semana. |
| Um treino só conta quando é concluído. Cancelar não conta. | Muda | "Encerrar aqui" conta como presença. |
| A conquista nova aparece num popup com a Doom face, ao concluir o treino. | Mantém | No mock aparece no resumo da sessão. |
| Ao chegar à calibração, um popup Doom aparece uma vez por exercício: bravo quando a última sessão ficou abaixo da faixa ("Que covardia!", "Isso não é treino, é passeio") e feliz quando passou do topo ("Progressão!"). | Sem decisão | O mock troca o popup por um texto no cartão de calibração. As frases falam de desempenho, o que a voz permite, mas são mais duras que o resto do app. |
| Um tutorial de 4 telas abre na primeira vez (Overload, escala GER, tipos de série, começar) e pode ser revisto nas configurações. | Muda | Sem tutorial de telas. Depois do cadastro, o Doomguy fala em balões e leva a pessoa por um tour do app e da metodologia, destacando cada parte da tela, e termina no montador de protocolo. No montador e no primeiro treino ele aparece uma vez em cada momento novo: modelo, dias, se faltar, exercícios, revisão, pergunta de carga, preparo, reserva e descanso. |
| A dica de navegação do trilho aparece até a pessoa rolar a primeira vez. | Sai | A lista de cartões não precisa de dica. |

## Biblioteca de exercícios

A biblioteca da v1 já é própria e serve de base para o MVP. O ponto que muda é o equipamento: hoje é texto livre, e o 3D e o arredondamento precisam dele como categoria.

| Regra na v1 | Status | Regra atual |
| --- | --- | --- |
| Cada exercício da biblioteca tem nome, apelido em português, GIF, músculos alvo e secundários, região do corpo, equipamentos, instruções e instruções em português. Qualquer pessoa lê; só admin escreve. | Mantém | É a fonte da biblioteca do mock. |
| O admin cadastra, edita e exclui exercícios. O GIF é obrigatório e só aceita .gif; excluir o exercício tenta apagar o arquivo. | Muda | O v2 não tem papel de admin. Cadastrar, editar e excluir exercícios sai do app e passa a ser feito por um script com a chave de serviço, rodado fora do app, com as mesmas regras de GIF. |
| A busca procura no nome e no apelido, com tradução de termos de academia do português para o inglês, e pagina de 30 em 30. | Mantém | Requisito do MVP. |
| Os GIFs recebem um filtro neon: verde até GER 10 e vermelho do GER 11 para cima. O filtro pode ser desligado. | Mantém | Requisito do MVP. |
| A aba Exercícios só aparece para admin. | Sai | Sem papel de admin, a aba não existe. |
| O equipamento é um texto livre, como "Barra" ou "Halteres". | Muda | O exercício precisa de uma categoria de equipamento (barra, Smith, máquina de anilhas, máquina de placas, halteres) e, nas máquinas de placas, do tamanho da pilha. |
| As telas mostram o crédito "Dados de exercício por ExerciseDB, uso não comercial". | Sem decisão | A licença importa se o app virar produto pago. |

## Contas e acesso

O cadastro e o login da v1 se mantêm. Os papéis da v1 têm falhas de segurança, e a regra atual resolve removendo os papéis: o v2 não tem treinador nem admin, e cada conta só acessa os próprios dados. Quem já depende de você para treinar recebe o protocolo em CSV e importa na própria conta.

| Regra na v1 | Status | Regra atual |
| --- | --- | --- |
| O cadastro pede nome, e-mail, senha de pelo menos 8 caracteres e confirmação, mostra a força da senha e envia confirmação por e-mail. Há recuperação de senha por e-mail, e os e-mails têm o visual Doom. | Mantém | Requisito do MVP. |
| O papel do cadastro vem dos dados que o próprio app envia, e o gatilho do banco aceita qualquer valor. Além disso, a regra de acesso deixa a pessoa alterar o próprio perfil inteiro, inclusive o papel. | Muda | Falha de segurança resolvida removendo os papéis: o v2 não guarda papel nenhum, então não há o que alterar. |
| Treinador e admin podem ler e gravar os dados de qualquer usuário, não só dos alunos atribuídos. As funções do servidor conferem o papel, mas não o vínculo com o aluno. | Muda | Falha de segurança: nenhuma conta lê ou grava dados de outra pelo app, e não existem funções do servidor que façam isso. |
| O treinador vê os alunos atribuídos a ele; o admin vê todos, muda o papel de qualquer pessoa e atribui treinador. | Sai | O papel de treinador sai do MVP, e o de admin também. Quem já depende de você para treinar recebe o protocolo em CSV e importa na própria conta. |
| Ao visualizar um aluno, o app troca todo o estado pelo dele, grava pelas funções do servidor, guarda uma cópia do estado do treinador e mostra uma faixa "Visualizando". | Sai | Sem papel de admin, ninguém edita o protocolo de outra conta. |
| O primeiro admin só é criado editando o banco pelo painel do Supabase. | Sai | Sem papel de admin, não há primeiro admin a criar. |
| O admin tem um botão flutuante de feedback que envia bug ou melhoria por e-mail, com captura de tela, erros recentes do console e um recorte do estado. | Sem decisão | Sem papel de admin, o botão precisa ir para todas as contas ou sair. Se ficar, o recorte do estado não pode levar token nem dado de outra pessoa. |
| Sair limpa os dados locais na hora e encerra a sessão em segundo plano. | Mantém | Requisito do MVP. |

## Infraestrutura com efeito em regra

Estas regras técnicas mudam o que a pessoa vê ou perde. A sincronização é a que mais se sobrepõe ao MVP, que precisa funcionar sem internet.

| Regra na v1 | Status | Regra atual |
| --- | --- | --- |
| Cada seção (protocolo, registros, histórico, conquistas, sessões) é enviada ao banco 1,5 segundo depois da última mudança, como um JSON inteiro. A última gravação vence, mesmo vinda de outro aparelho. | Muda | Requisito do MVP: grava no aparelho primeiro e envia por fila, com registros só acrescentados. |
| Falhas de sincronização aparecem só no console. | Muda | Requisito do MVP: a falha aparece para a pessoa. |
| O aviso de fim de descanso por push é opcional, de melhor esforço, limitado a 10 minutos e cancelado ao pular ou ajustar o tempo. | Mantém | A forma de entrega continua como decisão em aberto. |
| O app é um PWA instalável, em retrato, que se atualiza sozinho. | Mantém | Requisito do MVP. |
| Ao reabrir o app, o descanso em andamento é retomado. | Mantém | Requisito do MVP. |
| Se uma tela trava, uma tela de erro por aba diz que o progresso está salvo e oferece recarregar. | Mantém | Requisito do MVP. |

## Código da v1 que não aparece no app

Cinco partes do código existem, mas nenhuma aba ou tela chega até elas. Elas têm regras próprias, que não entram na comparação acima.

- **Dieta:** a tela calcula as calorias pela fórmula de Mifflin-St Jeor com fator de atividade, soma 350 kcal no ganho de massa e tira 400 na definição. Usa 2 g de proteína e 1 g de gordura por kg e monta um plano de refeições pelos horários de treino e sono, com lista de micronutrientes. O perfil de peso, altura, idade e sexo só serve a ela. Está fora do MVP.
- **Cronômetro avulso:** tem os tempos prontos de 2:00, 1:30, 1:00 e 0:20 e uma legenda de tipos de série e GER. A legenda pode virar as dicas do app.
- **Cartão de registro antigo:** registrava carga e repetições série a série, com observações e cálculo de aquecimento em 45, 70, 75 e 80% da carga. Foi substituído pela sessão guiada.
- **Cabeçalho que se esconde ao rolar:** a função existe, mas nunca é acionada.
- **Observações por exercício:** o histórico ainda exibe o campo, mas a sessão guiada não tem onde preenchê-lo. Fica sem decisão se volta.

## Conflitos que pedem decisão

São doze pontos em que a v1 e a regra atual se contradizem e nenhuma das duas foi escolhida. Os quatro primeiros mudam o modelo de dados e convém decidir antes do roadmap.

1. **Semanas do protocolo.** A v1 tem semanas com conteúdo próprio, agrupamento em faixas e tipo de semana. O mock tem uma semana-tipo repetida durante a fase. Qual das duas estruturas o MVP adota?
2. **Escolher o treino.** A v1 deixa iniciar qualquer semana e qualquer dia. A regra atual oferece o treino pelo modo de agenda. A escolha livre continua existindo, mesmo que escondida?
3. **Fim da sessão.** A v1 só grava ao tocar em Fechar depois do último passo, e cancelar descarta tudo. A regra atual grava a cada série e permite encerrar antes contando presença. Cancelar sem salvar continua existindo?
4. **Músculo acessório.** A v1 aceita um por exercício; o mock aceita vários. A matriz de preparo funciona com os dois, mas o CSV da v1 tem uma coluna só.
5. **Sem desculpa e Hellwalker.** Na v1 premiam 3 e 7 dias seguidos, o que contradiz o princípio de não punir falta. Os nomes ficam com uma definição nova por presença semanal, ou as duas conquistas saem?
6. **Rip and tear.** Na v1 é passar do topo da faixa em todas as séries do treino; o mock usa 3 cargas subindo na mesma sessão. Qual definição fica?
7. **Popups de bravo e feliz.** Voltam como na v1, com as frases duras, ou ficam como texto no cartão de calibração?
8. **Exercício sem séries.** A v1 permite salvar; o mock exige pelo menos uma. Vale permitir como rascunho?
9. **Faixa de repetições personalizada.** A v1 aceita qualquer faixa além das cinco prontas; o mock só as cinco.
10. **Descanso de preparo de 90 segundos.** A v1 oferece; o mock não.
11. **Exercícios salvos.** A v1 tem uma lista pessoal além da biblioteca geral. O MVP mantém as duas ou fica só com a biblioteca?
12. **Importar e exportar CSV.** Decidido: volta para toda conta, no Plano, só para o próprio protocolo, com relatório antes de substituir. O papel de admin e o painel admin saem do v2.

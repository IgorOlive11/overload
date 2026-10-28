# Overload: regras de negócio

Fonte única das regras do MVP. Em conflito com qualquer outra fonte, vale este arquivo.

Ele nasce do [rascunho das regras](rascunho-regras.md), validado pela spike #25 no registro [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md) (status aceita, com as 14 respostas do PO) e pelas cinco respostas do PO na [0003](../decisoes/0003-aproveitamento-da-v1.md). Este arquivo não decide regra nova.

## Como ler

- Cada regra que veio de uma resolução ou de uma resposta cita o registro entre parênteses. Exemplo: "(0005, resposta 3)" é a resposta 3 do PO na seção "Respostas do PO" da 0005.
- Regra citada como "(0005, proposta)" é uma resolução que a 0005 propôs para uma divergência do mock e que o PO aceitou com o registro. Ela vale como regra.
- O mock (`design/mock/`) é a referência das telas. Onde a regra diverge dele, a divergência está na seção [Divergências com o mock](#divergências-com-o-mock), com a decisão que a justifica.
- Termos: **GER** é a escala de esforço (repetições na reserva) de 7 a 13; **série válida** é a série de trabalho; **preparo** é a série de aquecimento do próprio exercício; **reel** é o trilho vertical de cartões da sessão.

## Execução da sessão

### Passos e reel

- A sessão é uma lista linear de passos, exercício a exercício, na ordem do protocolo: pergunta de carga (calibração), séries de preparo e séries válidas.
- Os passos ficam num reel navegado por arrasto, rolagem, setas do teclado, botões de anterior e próximo e uma faixa para voltar ao passo atual. Os vizinhos aparecem menores e apagados, e o 3D do equipamento fica dentro do cartão ativo.
- Passos passados podem ser corrigidos e os futuros ficam bloqueados.
- Não há dica de navegação do reel. O tour do Doomguy mostra o reel uma vez (0005, resposta 2).
- Cada cartão tem o botão de passo a passo, com o GIF, os músculos, o equipamento e as instruções, quando o exercício está vinculado à biblioteca.
- A sessão ativa e o cronômetro geral sobrevivem a recarregar a página, porque o tempo é calculado a partir do horário de início.

### Pergunta de carga e cartão de sugestão

- A pergunta de carga aparece por padrão na primeira vez que a pessoa faz o exercício com aquela configuração. Conta como a mesma configuração o mesmo exercício com a mesma lista de tipos de série, e o histórico do exercício vale entre protocolos diferentes (0005, resposta 1).
- A pergunta usa a reserva de cada nível de GER: na série normal de GER 7 a 9 usa a reserva do nível (GER 8 pergunta 2 a 3 na reserva); GER 10 pergunta "indo até a falha"; GER 11 ou mais pergunta "além da falha". Os outros tipos de série têm pergunta própria.
- Da segunda vez em diante aparece um cartão de sugestão com a Doom face, em vez da pergunta:
  - Se a carga se manteve, o cartão mostra o que a pessoa fez da última vez ("Você fez X reps com Y de carga") e pede uma repetição a mais com a mesma carga.
  - Se houve progressão, o cartão diz que a pessoa superou os limites, mostra a carga nova da progressão automática e a faixa inteira de repetições como meta.
  - Se a última sessão ficou abaixo da faixa, o cartão avisa, mantém a carga e sugere ajustar se a pessoa repetir o resultado.
  - O botão é **Ok!**. **Ajustar a carga** abre o campo de carga.
- A reação de bravo e de feliz fica no texto do cartão de sugestão. Não há popup (0005, resposta 13).
- Na primeira vez, o campo de carga é digitável, com mais e menos ao lado, e começa com a carga padrão do equipamento (tabela abaixo). O botão só libera com carga maior que zero. No cartão de sugestão a carga já vem calculada e o campo só aparece em Ajustar a carga.
- Corrigir a carga de um exercício já passado vale para as séries que ainda faltam, sem refazer as feitas.
- Nas séries válidas a carga aparece só para leitura, com um cadeado que explica onde corrigir.

### Equipamento: carga padrão, passo e arredondamento

O equipamento é uma categoria: barra, Smith, máquina de anilhas, máquina de placas ou halteres. Nas máquinas de placas, o exercício também guarda o tamanho da pilha. Quem define a categoria de cada exercício da biblioteca é a spike #43 (0003, resposta 2).

| Equipamento | Carga padrão (primeira vez) | Passo e arredondamento | Unidade |
| --- | --- | --- | --- |
| Barra | 40 kg | 2,5 kg | kg |
| Smith | 30 kg | 2,5 kg | kg |
| Máquina de anilhas | 40 kg | 5 kg | kg |
| Máquina de placas | 30 kg | 2,5 kg | kg |
| Halteres | 10 kg | 2 kg por mão | kg cada |

Valores da carga padrão e do passo: 0005, linhas "Campo de carga na primeira vez" e "Passo e arredondamento". Além deles (0005, proposta): a base da barra é 20 kg e a do Smith é 15 kg; nas máquinas de anilhas, as anilhas extras no gympin entram acima da pilha; a polia usa o modelo da máquina de placas.

- O passo dos botões de mais e menos e o arredondamento da carga seguem o equipamento, tanto na carga de trabalho quanto na do preparo.
- A unidade mostrada segue o equipamento. Halteres mostram "kg cada".

### Preparo

- A quantidade de preparo segue o estado do músculo na sessão: 3 quando ele estreia, 2 quando já foi acessório, 1 quando já foi principal. Ter sido principal vence ter sido acessório. O cálculo automático nunca dá zero; só a trava manual do exercício, de 0 a 3, chega a zero.
- Um exercício pode ter vários músculos acessórios, e cada um só conta para os exercícios seguintes (0005, linha "Músculo acessório").
- A rampa usa 55, 70 e 85% da carga de trabalho com 3 séries, 60 e 80% com 2 e 80% com 1, com repetições descendo de 8 a 10 até 4 a 6.
- O preparo é sempre GER 7. A carga é arredondada pelo equipamento, pode ser editada no cartão, e o app guarda a carga e as repetições que a pessoa registrou, sem recalculá-las.
- Um preparo é pulado quando a carga dele, arredondada, já é igual ou maior que a de trabalho e as repetições dele alcançam o mínimo da série válida. O primeiro preparo nunca é pulado, e tipos sem faixa de repetições nunca têm corte.

### Série normal, esforço e tipos de série

- Os tipos de série são três: normal, rest-pause e muscle round (0005, linha "Tipos de série").
- Todo cartão de série mostra o painel de GER com Doom face, rótulo, nome e repetições na reserva. A pergunta de carga não tem face. Preparo é verde e série válida é vermelha.
- O campo de repetições da série normal é digitável, com mais e menos ao lado. Ele começa na meta de hoje, que vem da sugestão, ou no meio da faixa quando não há histórico.
- Depois de cada série normal, a pessoa registra quanto sobrou ("Quanto sobrou?"), com a face e o texto de cada GER. Esse registro entra na progressão.
- **Rest-pause:** carga para cerca de 8 repetições; bloco 1 até a falha; pausa automática de 20 segundos que pode ser pulada; bloco 2 até a falha. São dois blocos. Um bloco só conclui com mais de zero repetições.
- **Muscle round:** no máximo 6 blocos de 4 repetições, com 10 segundos entre eles. A pessoa pode falhar em qualquer bloco, e a série termina ali com as repetições daquele bloco. O sexto bloco vai até a falha.

### Descanso

- O descanso roda antes de um preparo ou de uma série válida, nunca depois da pergunta de carga. O valor vem do exercício (entre séries e de preparo), com um padrão do protocolo.
- Durante o descanso o cartão atual fica bloqueado e só libera com Pronto ou Pular. Há ajuste de menos 15 e mais 15 segundos, e o painel pulsa em verde quando o tempo acaba. O painel fica embaixo do reel, sem cobrir a tela.
- O descanso é calculado pelo horário de término e sobrevive a recarregar a página. No fim toca um alarme de duas notas e vibra quando o aparelho permite.
- Fora da tela de treino, o descanso vira um rodapé visível no app inteiro.

### Fim da sessão

- O treino termina sozinho na última série e vai direto para o resumo, com a duração. Os registros são gravados série a série.
- **Encerrar aqui** salva o que foi feito e conta presença. Encerrar antes não desbloqueia conquista nova no resumo (0005, proposta).
- **Cancelar o treino** é um botão ao lado do botão de finalizar, com confirmação. Cancelar descarta a sessão sem salvar nada e sem contar presença, para quem abriu um treino por engano ou para testar (0005, resposta 3). O desenho e a regra detalhada ficam na issue própria do cancelamento.

## Progressão, registro e histórico

### Quando a carga muda

- O app calcula a carga sugerida e explica o motivo.
- **Série normal:** a carga sobe quando todas as séries chegam ao topo da faixa e o GER registrado não passa do alvo.
- **Salto grande:** quando o incremento passa de 10% da carga (um halter de 10 kg indo para 12, por exemplo), a carga só sobe com uma repetição além do topo da faixa.
- **Rest-pause:** sobe com 10 repetições no bloco 1.
- **Muscle round:** sobe quando os 6 blocos saem completos e o sexto passa de 4 repetições. Falhar nos blocos anteriores é permitido, e nesse caso a carga não sobe.
- **Abaixo da faixa:** o app avisa e mantém a carga. Ele não reduz a carga sozinho.
- **Volta depois de pausa:** de 15 a 27 dias sem treinar o exercício, a carga continua a mesma e a meta vai para o começo da faixa. A partir de 28 dias, a carga vem 10% mais leve.

### Incremento por equipamento

O incremento da progressão não é o passo do arredondamento. Na barra, por exemplo, o incremento é 5 kg e o passo é 2,5 kg (0005, linha "Incremento por equipamento").

| Equipamento | Incremento de progressão |
| --- | --- |
| Barra | 5 kg |
| Smith | 2,5 kg |
| Máquina de anilhas | 5 kg |
| Máquina de placas | 2,5 kg |
| Halteres | 2 kg |

### Registro e histórico

- Cada exercício tem identificador estável, e o histórico é completo. Os registros só são acrescentados e ficam ligados ao exercício, nunca à posição dele na grade. Renomear, reordenar ou trocar um exercício não perde nem troca o histórico. (O limite de 5 cargas do mock é só da simulação.)
- O último registro é comparado por posição: o preparo 1 de hoje com o preparo 1 da última vez, a série 2 com a série 2.
- O histórico de sessões é inteiro, porque presença, meta semanal e critério de fase dependem dele.
- A aba **Progresso** mostra a carga por exercício ao longo das sessões e a presença por semana.
- Limpar o histórico e as observações por exercício ficam fora do MVP (0005, resposta 4).

## Protocolo e agenda

### Estrutura

- O protocolo é uma **semana-tipo** que se repete durante a fase. A fase tem 4, 6 ou 8 semanas (0003, resposta 5; 0005, linha "Semanas do protocolo"). Não existem semanas com conteúdo próprio, agrupamento de semanas em faixas, tipo de semana nem número de semanas de 1 a 52.
- Um dia pode ser marcado como descanso. Dia de descanso não inicia treino, e os exercícios dele ficam guardados.
- O exercício tem nome, músculo, acessórios, apelido em português, vínculo com a biblioteca, descanso entre séries, descanso de preparo e trava de preparo. Ele tem sempre pelo menos uma série: os dois montadores bloqueiam a remoção da última (0005, resposta 7).
- A série tem tipo, GER e faixa de repetições. Só a normal escolhe o GER (7 a 13) e a faixa.
- As faixas de repetições são quatro: 4 a 6, 6 a 8, 8 a 10 e 10 a 12. Uma faixa diferente só existe quando vem do CSV, e aparece como "Do protocolo" (0005, resposta 8).
- **Série nova** vem como normal, GER 10, faixa 8 a 10, em todos os pontos de criação. Os modelos do montador simples têm os próprios padrões, porque são modelos e não série nova (0005, proposta).
- Descanso entre séries: de 60 a 180 segundos. Descanso de preparo: 30, 40 ou 60 segundos. O de 90 segundos de preparo não existe (0005, resposta 6).
- Exercícios e séries são reordenados arrastando pela alça, e também aceitam as setas do teclado. No toque é preciso segurar 200 milissegundos antes de arrastar.
- Remover exercício ou série não pede confirmação. **Limpar este dia** e **Descartar rascunho** pedem toque duplo para confirmar.
- Não há lista pessoal de exercícios salvos (0005, resposta 9) nem botão para vincular em massa os exercícios do protocolo à biblioteca (0005, resposta 10).
- Ao digitar 3 letras do nome, o app busca na biblioteca, com tradução de termos de academia do português para o inglês. O vínculo traz músculo e apelido; sem vínculo, o músculo é cadastrado à mão.

### Modo de agenda e escolha do treino

- O modo de agenda é escolhido ao criar o protocolo: **dia da semana fixo**, ou **sequência**, em que o app oferece o treino pendente quando a pessoa falta.
- A tela Hoje oferece o próximo treino. A pessoa também pode escolher outro treino da semana para fazer hoje, num menu discreto, sem mudar a regra de presença (0005, resposta 5).
- No dia fixo, se o cadastro cair num dia de descanso, o Hoje mostra o próximo treino e deixa treinar mesmo assim.

### Fase travada e semana de ajuste

- Com a fase da camada de aderência ligada, o plano fica travado, e as mudanças viram ideias e rascunho.
- No primeiro protocolo da conta há uma **semana de ajuste**: nos 7 dias depois do primeiro treino o plano fica editável, e só depois a fase trava.
- A conta pode ser criada dias antes. A semana de ajuste, a meta semanal e a regra de nunca faltar duas vezes só começam a contar no primeiro treino.

### CSV

- Importar e exportar CSV vale para toda conta, no Plano, e só para o próprio protocolo. É assim que alguém monta protocolos para quem depende dele: manda o arquivo, e a pessoa importa na própria conta.
- O arquivo tem as mesmas colunas da v1, uma linha por série, com agenda e `fase_semanas` no fim. Vários acessórios ficam separados por barra vertical (`|`).
- Só a primeira semana do arquivo entra. O relatório da importação avisa quantas semanas o arquivo tinha (0003, resposta 5).
- Valores inválidos: tipo inválido vira normal; GER e faixa inválidos viram o padrão da série nova (GER 10, 8 a 10); descanso de preparo de 90 segundos vira o valor mais próximo oferecido, também no exercício. Cada troca aparece no relatório (0005, resposta 6 e proposta).
- O relatório mostra também os tipos de série que saíram e os exercícios sem vínculo na biblioteca. O protocolo só é substituído depois de a pessoa confirmar, e entra como rascunho.
- Ao exportar, células que começam com `=`, `+`, `-` ou `@` são neutralizadas, para o Excel não executar fórmulas.

## Base fisiológica dos padrões

Os padrões do montador seguem a evidência atual sobre treino de força. O volume é baixo de propósito: garante o mínimo de 4 séries semanais por grupo muscular e troca parte do ganho máximo por treinos curtos, mais fáceis de manter.

| Padrão | Regra | Evidência |
| --- | --- | --- |
| Volume semanal | Cada grupo muscular soma pelo menos 4 séries por semana. O montador avisa quando um grupo fica abaixo disso. | 4 séries semanais é o mínimo recomendado por [Iversen e colegas (2021)](https://lida.sport-iat.de/ta/Record/4073965). Mais séries dão mais massa muscular, com retorno decrescente ([Pelland e colegas, 2024, pré-publicação](https://sportrxiv.org/index.php/server/preprint/view/460)). |
| Contagem de séries | A série em que o músculo é só acessório conta como meia série. | A contagem fracionada foi a que melhor explicou o ganho de massa muscular em [Pelland e colegas (2024)](https://sportrxiv.org/index.php/server/preprint/view/460). |
| Modelo Superior e inferior | 4 dias, cada parte do corpo 2 vezes por semana. Todos os grupos fecham 4 séries semanais, e os dias levam de 29 a 41 minutos. | Treinar cada músculo 2 vezes por semana deu mais massa muscular do que 1 vez em [Schoenfeld e colegas (2016)](https://lida.sport-iat.de/ta/Record/4042947). |
| Modelo Empurrar, puxar e pernas | 3 dias, cada músculo 1 vez por semana, com séries a mais para todos os grupos fecharem 4 séries semanais. Os dias levam de 29 a 43 minutos. Em 6 dias, o ciclo roda 2 vezes. | Com o volume igualado, a frequência quase não muda a massa muscular, mas ajuda na força ([Pelland e colegas, 2024](https://sportrxiv.org/index.php/server/preprint/view/460)). |
| Reserva por série | A primeira série deixa 2 a 3 repetições na reserva e a última 1. Isolados de máquina com série única vão até a falha com técnica perfeita. | A massa muscular cresce quanto mais perto da falha ([Robinson e colegas, 2024](https://rke.abertay.ac.uk/en/publications/exploring-the-dose-response-relationship-between-estimated-resist/)). As pessoas erram a estimativa em cerca de 1 repetição para menos ([Halperin e colegas](https://sportrxiv.org/index.php/server/preprint/view/67)). |
| Faixa de repetições | Nos modelos, compostos pesados usam 6 a 8, stiff e compostos médios 8 a 10 e isolados 10 a 12. | A massa muscular cresce de forma parecida entre faixas diferentes quando a série chega perto da falha, então a escolha segue o costume. A faixa mais alta no stiff dá margem para aprender a técnica, um julgamento prático, não um achado de estudo sobre lesão. |
| Descanso | 2 minutos nos compostos, 90 segundos nos isolados e 40 segundos entre séries de preparo. | Descansar mais de 60 segundos teve um pequeno benefício, sem ganho claro acima de 90 ([Singer e colegas, 2024](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/text)). A ACSM recomenda 1 a 2 minutos para iniciantes ([ACSM, 2009](https://sfu.ca/~ryand/kin343/ACSMresistance.pdf)). |
| Preparo | 3, 2, 1 ou 0 séries do próprio exercício, conforme o músculo já tenha trabalhado na sessão. | Iversen e colegas recomendam limitar o aquecimento a séries do próprio exercício. A revisão de [Ribeiro e colegas (2021)](https://revistas.rcaap.pt/motricidade/article/view/21143) achou resultados inconsistentes sobre aquecimento em geral. |
| Progressão | A carga sobe quando todas as séries chegam ao topo da faixa, com incremento conforme o equipamento. Quando o incremento passa de 10% da carga, a carga só sobe com uma repetição além do topo. | Com faixas de 2 repetições, um salto grande derruba a pessoa para baixo da faixa logo depois de subir. Progredir por repetições ou por carga deu resultados parecidos ([Plotkin e colegas, 2022](https://peerj.com/articles/14142)). A ACSM recomenda aumentos de 2 a 10%. |
| Volta depois de pausa | De 15 a 27 dias sem treinar, a carga continua a mesma e a meta vai para o começo da faixa. A partir de 28 dias, a carga vem 10% mais leve. | A força máxima fica praticamente preservada até cerca de 4 semanas parado em adultos jovens ([Bosquet e colegas, 2013, resumido pela Stronger by Science](https://www.strongerbyscience.com/detraining/)). |
| Rest-pause | Bloco 1 até a falha, 20 segundos de pausa e bloco 2 até a falha. | Com volume igualado, deu massa muscular parecida com a do treino tradicional e mais ganho no agachamento ([Enes e colegas, 2021](https://getfitcraft.com/science/rest-pause-training-research)). |
| Muscle round | Até 6 blocos de 4 repetições com 10 segundos de pausa. | Não tem estudo próprio. Funciona por analogia com o rest-pause e as séries em cluster. |
| Mesma parte do corpo | Nunca em dois dias seguidos, nem na passagem de domingo para segunda. | A ACSM recomenda 2 a 3 dias por semana, não consecutivos, para iniciantes. |

O alerta de dia acima de 60 minutos é uma regra prática de aderência, não um limite fisiológico.

## Aderência e gamificação

O princípio é premiar presença sem punir falta. Não existe sequência de dias seguidos: o app conta a presença contra a meta da semana.

- **Presença:** um treino concluído conta presença. Encerrar aqui também conta. Cancelar o treino não conta.
- **Faltar de novo:** perder um treino torna o próximo obrigatório, e faltar outra vez gera só o aviso e a reação da Doom face, sem punição na fase nem na meta (0005, resposta 11).
- **Conquistas:**

| Conquista | Definição |
| --- | --- |
| Primeira missão | 1 treino concluído |
| Habitué | 5 treinos concluídos |
| Veterano | 10 treinos concluídos |
| Doom slayer | 30 treinos concluídos |
| Sem desculpa | 2 semanas seguidas na meta (0005, resposta 12) |
| Rip and tear | 3 cargas sobem na mesma sessão (0005, resposta 12) |
| Hellwalker | uma fase inteira na meta (0005, resposta 12) |

- A conquista nova aparece no resumo da sessão.
- Não há tutorial de telas. Depois do cadastro, o Doomguy fala em balões e leva a pessoa por um tour do app e da metodologia, destacando cada parte da tela, e termina no montador de protocolo. No montador e no primeiro treino ele aparece uma vez em cada momento novo: modelo, dias, se faltar, exercícios, revisão, pergunta de carga, preparo, reserva e descanso. O reel é mostrado uma vez nesse tour (0005, resposta 2).

## Biblioteca de exercícios

- Cada exercício da biblioteca tem nome, apelido em português, GIF, músculos alvo e secundários, região do corpo, categoria de equipamento, instruções e instruções em português. Qualquer pessoa autenticada lê.
- A biblioteca continua vindo da ExerciseDB, com a licença não comercial (0003, resposta 4). O crédito "Dados de exercício por ExerciseDB, uso não comercial" fica visível onde aparece o GIF, no passo a passo (0005, proposta).
- A busca procura no nome e no apelido, com tradução de termos de academia do português para o inglês, e pagina de 30 em 30.
- Os GIFs recebem um filtro neon: verde até GER 10 e vermelho do GER 11 para cima. O filtro pode ser desligado (0003, resposta 1).
- **Cadastro:** cadastrar, editar e excluir exercícios é feito só por um script com a chave de serviço, rodado fora do app, com as regras de GIF da v1 (GIF obrigatório, só `.gif`). Não há aba de exercícios, painel de admin nem painel separado previsto (0003, resposta 3).
- O mapeamento dos equipamentos da ExerciseDB para as cinco categorias é da spike #43 (0003, resposta 2).

## Contas e acesso

- O cadastro pede nome, e-mail, senha de pelo menos 8 caracteres e confirmação, mostra a força da senha e envia confirmação por e-mail. Há recuperação de senha por e-mail, e os e-mails têm o visual Doom.
- O v2 não tem papel de usuário: não há treinador nem admin, e nenhuma permissão é guardada num campo que a pessoa possa alterar. Cada conta só acessa os próprios dados, e nenhuma função do servidor lê ou grava dados de outra conta.
- Quem depende de outra pessoa para treinar recebe o protocolo em CSV e importa na própria conta.
- Sair limpa os dados locais na hora e encerra a sessão em segundo plano.

## Infraestrutura com efeito em regra

- Os dados são gravados no aparelho primeiro e enviados ao banco por uma fila, com registros só acrescentados. O app funciona sem internet.
- Falha de sincronização aparece para a pessoa.
- O app é um PWA instalável, em retrato, que se atualiza sozinho.
- Ao reabrir o app, o descanso em andamento é retomado.
- Se uma tela trava, uma tela de erro por aba diz que o progresso está salvo e oferece recarregar.

## Divergências com o mock

O mock é a referência das telas. As regras abaixo divergem dele, ou o mock ainda não as mostra. Vale a regra, e cada linha cita a decisão que a justifica. O mock deve ser corrigido por issue própria (0005, "Consequências").

| Regra | O que o mock faz | Decisão |
| --- | --- | --- |
| Existe o botão de cancelar o treino, com confirmação, que descarta a sessão sem salvar nem contar presença. | Não tem o botão nem o modal. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), resposta 3 |
| A pessoa pode escolher outro treino da semana num menu discreto. | A tela Hoje oferece só o próximo treino. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), resposta 5 |
| Preparo de 90 segundos não existe; a importação troca para o valor mais próximo e o relatório avisa. | O importador aceita 90 segundos no exercício sem avisar, e o montador não oferece o valor. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), resposta 6 |
| Exercício não fica sem séries: os dois montadores bloqueiam a remoção da última. | O montador avançado deixa remover a última série. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), resposta 7 |
| Faixa personalizada só vem do CSV, como "Do protocolo". As faixas de exemplo 8 a 12, 5 a 9 e 6 a 10 do mock são dados de exemplo, não regra. | O plano da fase 1, o histórico de exemplo e o rascunho da fase 2 usam essas faixas. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), resposta 8 e linha "Faixas de repetição" |
| Série nova é normal, GER 10, 8 a 10, em todos os pontos de criação. | Adicionar exercício no montador avançado cria duas séries GER 10, 8 a 12; no montador simples, trocar o tipo dá GER 8. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), proposta da linha "Série nova" |
| GER e faixa inválidos no CSV viram GER 10 e 8 a 10. | GER inválido vira 9 e faixa inválida vira 8 a 12. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), proposta da linha "Valores inválidos no CSV" |
| O cadastro da biblioteca é só por script, sem painel previsto. | A lateral do mock diz que o cadastro "vai para um painel web separado". | [0003](../decisoes/0003-aproveitamento-da-v1.md), resposta 3 |
| O filtro neon dos GIFs e o crédito da ExerciseDB fazem parte do MVP. | Nenhum dos dois aparece no mock. | [0003](../decisoes/0003-aproveitamento-da-v1.md), respostas 1 e 4 |
| O histórico é completo. | Guarda só as 5 últimas cargas por exercício. | [0005](../decisoes/0005-cruzamento-das-regras-com-o-mock.md), linha "Identificador estável e histórico completo" |

## Fora do MVP

Não implemente nada desta lista.

- Painel de admin, papel de admin, papel de treinador e visualização do aluno (0003, resposta 3; [0009](../decisoes/0009-sem-papel-de-administrador.md)).
- Semanas com conteúdo próprio, agrupamento de semanas em faixas, tipo de semana e protocolos de 1 a 52 semanas (0003, resposta 5).
- Limpar todo o histórico e observações por exercício (0005, resposta 4).
- Lista pessoal de exercícios salvos (0005, resposta 9).
- Botão de vincular exercícios à biblioteca nas configurações (0005, resposta 10).
- Popups de bravo e feliz com as frases duras da v1 (0005, resposta 13).
- Botão de feedback. Vira issue futura (0005, resposta 14).
- Sequência de dias seguidos, widowmaker e pulse como tipos de série, descanso de preparo de 90 segundos, faixa de repetições personalizada pela tela e tutorial de 4 telas.
- Dieta ([0010](../decisoes/0010-dieta-fora-do-produto.md)), cronômetro avulso, cartão de registro antigo e cabeçalho que se esconde ao rolar.

## Em aberto

Estes pontos dependem de outra spike e não são regra ainda.

- Mapeamento dos equipamentos da ExerciseDB para as cinco categorias: #43.
- Forma de entrega do aviso de fim de descanso por push (0005, linha "Aviso de fim de descanso por push"). Quando existir, é de melhor esforço, limitado a 10 minutos e cancelado ao pular ou ajustar o tempo.
- Desenho e regra detalhada do cancelamento do treino: issue própria (0005, resposta 3).

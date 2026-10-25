# Reconstruir o v2 a partir do mock e levar da V1 só peças pequenas e isoladas

- Status: proposta
- Data: 2026-10-25
- Quem decidiu: proposta da spike #22, aguarda a aprovação do PO

## Contexto e problema

A V1 está no repositório https://github.com/IgorOlive11/ultima-weapon, com cerca de 10 mil linhas de JSX e JS. Este repositório começou com uma cópia reduzida dela em `src/`: login, `useAuth`, `useStore` e `supabase.js`, cerca de 140 linhas. O v2 tem um mock próprio (`design/mock/`), regras revisadas (`docs/produto/rascunho-regras.md`) e um modelo de dados novo, sem papéis e sem JSON por seção (`docs/tecnico/rascunho-arquitetura.md` e #28).

A pergunta é o que da V1 entra no v2 sem retrabalho e o que sai mais barato refazer a partir do mock. Quais funcionalidades entram no MVP fica fora deste registro: isso é com o rascunho de regras, na #25 e na #24.

A leitura foi feita no último commit da `main` do ultima-weapon (77c7407). Os caminhos da tabela são desse repositório.

## O que pesou na decisão

- Quase toda a lógica de negócio da V1 está dentro de `src/hooks/useStore.js` (1059 linhas) e das páginas `src/pages/WorkoutPage.jsx` (2083) e `src/pages/ProtocolPage.jsx` (1618), misturada com estado e interface. Separar a regra do resto custa mais do que reescrever a regra a partir do mock, que já a tem isolada em `design/mock/regras.js`.
- As regras que mudaram estão listadas em `docs/produto/rascunho-regras.md`. Copiar o código da V1 traria de volta a regra antiga, como o arredondamento único de 2,5 kg.
- A V1 não tem testes. O v2 exige teste por critério de aceite e os casos de `tests/oraculo`. Código copiado não chega com esses testes.
- O modelo de dados muda inteiro: a V1 guarda um JSON por seção em `user_data`, com sincronização em que a última gravação vence, e lê o papel do usuário. Tudo que conversa com o banco precisa ser refeito.
- Algumas peças da V1 são pequenas, não dependem do estado global e fazem algo que o mock não faz, porque o mock só simula. Essas valem a pena levar.
- As Doom faces da V1 (`public/doom-faces/ger7.png` a `ger13.png`) são, byte a byte, os mesmos arquivos de `design/assets/faces/doom-face-7.png` a `doom-face-13.png`. Já estão no repositório.

## Opções consideradas

1. Reconstruir o v2 a partir do mock e das regras revisadas, levando da V1 só as peças da tabela marcadas como Reaproveita ou Adapta, cada uma com teste.
2. Partir da V1 inteira e refatorar até chegar ao mock: trocar o store, o banco, as telas e as regras que mudaram.
3. Reconstruir tudo do zero, sem olhar o código da V1.

## Decisão

A recomendação é a opção 1. A opção 2 herdaria o que o v2 descartou (papéis, JSON por seção, a última gravação vence, cinco tipos de série, semanas com conteúdo próprio) e obrigaria a desmontar páginas de mais de mil linhas. A opção 3 jogaria fora peças que funcionam em produção e que o mock não cobre, como o filtro neon dos GIFs, o alarme de descanso e o seed da biblioteca.

| Parte | Caminho na V1 | Classificação | Motivo |
| --- | --- | --- | --- |
| Cálculo de carga | `src/utils/loads.js` | Descarta | Arredonda tudo em 2,5 kg (`round25`) e usa uma rampa própria (45%, 70%, 75% e 80%) que nem bate com `PREP_RAMPS`, da própria V1. O mock arredonda por equipamento (`EQ` e `roundEq` em `design/mock/regras.js`), como manda a regra atual. |
| Protocolo e escala GER | `src/data/protocol.js` | Adapta | Os textos da escala GER 7 a 13 (`GER_CONFIG`) e as rampas de preparo (`PREP_RAMPS`) são iguais aos do mock (`RAMPS`). O resto muda: cinco tipos de série contra três, grade de 8 semanas por 7 dias contra semana-tipo com fase. Vale levar só as tabelas de constantes, conferidas com o mock. |
| CSV do protocolo | `src/utils/protocolCsv.js` | Adapta | As 14 colunas são as mesmas que o mock usa, e o mock acrescenta `agenda` e `fase_semanas`. A neutralização de células com `=`, `+`, `-` e `@` existe só no mock (`design/mock/csv.js`). O leitor da V1 aceita tipos que saíram e substitui o protocolo sem confirmar, as duas coisas mudaram. Serve de ponto de partida para o importador. |
| Cronômetro de descanso | `src/utils/timerManager.js` | Reaproveita | São 20 linhas sem dependência que calculam o tempo pelo horário de término (`_endsAt`), como a regra que se mantém: o descanso sobrevive a recarregar a página. O mock só simula com um contador. |
| Alarme de fim do descanso | `src/utils/alarmSound.js` | Reaproveita | Gera o alarme de duas notas pela Web Audio API, sem arquivo de áudio, e explica por que o som é a garantia no iOS, onde não há vibração. A regra se mantém e o mock não tem som. |
| Busca na biblioteca | `src/lib/exerciseSource.js` | Adapta | O adapter que separa a fonte (ExerciseDB) da interface continua útil. A parte que lê do Supabase muda junto com a tabela `exercises_library`, que ganha o equipamento como categoria. |
| Dicionário de busca em português | `src/lib/exercisePtDictionary.js` | Reaproveita | É um mapa de vocabulário de academia em português e inglês, sem dependência, e a fonte continua só em inglês. |
| Seed da biblioteca | `scripts/seedExercises.mjs` | Adapta | Já roda fora do app com a chave de serviço, como a arquitetura pede para o v2. Precisa mapear os equipamentos da fonte para as categorias do mock (veja as Divergências). |
| Filtro neon dos GIFs | `src/components/NeonGifFilters.jsx` e `src/components/ExerciseGif.jsx` | Adapta | O filtro (verde até GER 10, vermelho do 11 para cima, com opção de desligar) é requisito do MVP no rascunho de regras e não existe no mock. Os filtros SVG podem ser levados como estão; a leitura do estado global muda. |
| Doom face | `src/components/DoomFace.jsx` | Descarta | O mock já tem a sua (`design/mock/doom-face.js`), com outra proporção, e as imagens já estão em `design/assets/faces`. |
| Demais componentes | `src/components` (`Header`, `Sidebar`, `ExerciseCard`, `GlobalRestTimer`, `TutorialModal`, `ExerciseDetailModal`, `ErrorBoundary`, `ViewingAsBanner`, `AdminExerciseFormModal`, `AdminFeedbackButton`) | Descarta | A navegação, os cartões e o tour do mock são outros. `ViewingAsBanner` e os dois de admin dependem dos papéis que saíram. |
| Páginas | `src/pages` | Descarta | As telas são de antes do mock. `TrainerPage`, `AdminPage` e `DietPage` são de funcionalidades que saíram (#28). A lógica que as páginas guardam já está descrita no rascunho de regras. |
| Estado global | `src/hooks/useStore.js` | Descarta | Guarda um JSON por seção e sincroniza o bloco inteiro, de modo que a última gravação vence. O v2 troca isso por linhas que só são acrescentadas e por uma fila offline. |
| Doom faces | `public/doom-faces` | Descarta | São os mesmos arquivos de `design/assets/faces`, que já estão no repositório e entram nos créditos da #27. |
| Manifesto e ícones | `public/manifest.json`, `public/icon-192.png` e `public/icon-512.png` | Descarta | A base do PWA (#36) cria o manifesto e os ícones com o nome, as cores e os ícones do mock. O manifesto da V1 usa outras cores e marca os ícones como `any maskable` ao mesmo tempo. |
| Service worker do push | `public/sw-push.js` e `src/utils/pushNotifications.js` | Descarta | A forma de entregar o aviso de fim de descanso é de uma spike própria (fora do escopo da #36). Ficam como referência para ela, não como base. |
| Edge Function de e-mail | `supabase/functions/send-email` | Adapta | O hook de e-mail do Auth com o Resend continua no v2, mas a função da V1 não confere a assinatura do webhook, e a arquitetura exige isso. |
| Edge Functions de aluno | `supabase/functions/get-student-data` e `supabase/functions/save-student-data` | Descarta | Existem só para o treinador ler e gravar os dados do aluno com a chave de serviço. O v2 não tem papéis. |
| Edge Function de feedback | `supabase/functions/send-feedback` | Descarta | Lê o papel em `profiles`, usa a chave de serviço e aceita qualquer origem (`Access-Control-Allow-Origin: *`). Se o botão de feedback ficar no v2, a função é reescrita do jeito que a arquitetura descreve. |
| Edge Function de push | `supabase/functions/schedule-rest-push` | Descarta | Segura uma chamada aberta por até 10 minutos só para avisar o fim do descanso, ponto que a arquitetura já critica. A substituição depende da spike de notificação. |
| Migrações | `supabase/migrations` | Descarta | Não refletem o banco no ar, que foi alterado pelo painel. O esquema real está em `docs/tecnico/legado/esquema-v1.sql`, e o v2 cria tabelas novas com a skill `nova-tabela`. |

O que o `src/` deste repositório deve virar:

- `src/lib/supabase.js` fica como está: cria o cliente com a chave anônima e não lê `user_metadata`.
- `src/hooks/useAuth.js` e o store mínimo em `src/hooks/useStore.js` servem só de rascunho para a funcionalidade de autenticação em `src/features`. Não leem papel nenhum, mas também não tratam erro de sessão.
- `src/pages/AuthPage.jsx`, `src/App.jsx` e `src/main.jsx` saem quando a base do PWA (#36) criar o shell em `src/app` com a tela de entrada do mock.
- As dependências que vieram da V1 no `package.json` (`@dnd-kit/*`, `framer-motion`, `react-icons` e `react-router-dom`) não são uma decisão. Cada uma fica se a funcionalidade que a usar justificar, e sai se nada a usar quando o v2 tiver as telas principais.

## Divergências

Diferenças entre a V1, o mock e as regras que esta spike encontrou e não resolve, porque a escolha é do PO. As que o rascunho de regras já lista como conflito só são citadas.

1. O rascunho de regras mantém o filtro neon dos GIFs como requisito do MVP, mas o mock não mostra o filtro em nenhuma tela. Ele entra no MVP mesmo sem estar no mock?
2. A ExerciseDB guarda os equipamentos como texto livre, em inglês, e um exercício pode ter mais de um. O mock usa cinco categorias (barra, Smith, máquina de anilhas, máquina de placas e halteres), e o arredondamento depende delas. Quem decide a categoria de cada exercício da biblioteca: um mapa automático no seed, uma revisão manual ou as duas coisas?
3. O rascunho de regras diz que o cadastro de exercícios sai do app e vai para um script, mas o comentário do PO na mesma regra fala num painel de admin com rota separada mais adiante, e a #28 registra que não há papel de administrador. O cadastro fica só no script, ou a arquitetura deve prever esse painel separado?
4. A V1 mostra o crédito da ExerciseDB com uso não comercial, e o rascunho de regras deixa esse ponto sem decisão. A biblioteca do v2 continua vindo da ExerciseDB, com essa licença?
5. A V1 tem semanas com conteúdo próprio, e o mock tem uma semana-tipo repetida na fase. O rascunho de regras já lista isso como o primeiro conflito. O importador de CSV adaptado da V1 deve esperar essa resposta antes de decidir o que fazer com as semanas além da primeira?

## Consequências

- Bom, porque o v2 não herda os papéis, o JSON por seção nem as regras que mudaram.
- Bom, porque cada peça levada da V1 entra pequena, já com teste, na pasta certa (`src/domain`, `src/lib` ou `src/features`).
- Bom, porque o seed, o filtro neon, o alarme e o cronômetro, que já funcionam em produção, não são reescritos do zero.
- Ruim, porque as telas são escritas de novo, o que é a maior parte do trabalho do v2.
- Ruim, porque a V1 continua sendo a única fonte de alguns comportamentos que o mock só simula (o descanso real, o push), e quem trabalhar neles precisa abrir o repositório antigo.

## Como conferir

- Nenhum arquivo do v2 importa ou copia `useStore.js`, `src/pages` ou `src/utils/loads.js` da V1.
- Cada peça trazida da V1 cita, no pull request, a linha desta tabela e o caminho de origem, e chega com teste.
- Nenhuma Edge Function do v2 aceita `Access-Control-Allow-Origin: *` nem lê papel do usuário.

## Issues de acompanhamento sugeridas

- Levar o cronômetro por horário de término e o alarme de duas notas da V1 para o v2, com testes, quando a sessão de treino for construída.
- Adaptar o seed e a busca da biblioteca de exercícios para o v2, com a categoria de equipamento. Depende da resposta à divergência 2.
- Levar o filtro neon dos GIFs para o passo a passo do exercício. Depende da resposta à divergência 1.
- Escrever o importador e o exportador de CSV do v2, partindo de `src/utils/protocolCsv.js` e de `design/mock/csv.js`. Depende da resposta à divergência 5.
- Reescrever a função de e-mail do Auth com a verificação de assinatura.
- Revisar, quando as telas principais existirem, as dependências que vieram da V1 no `package.json`.

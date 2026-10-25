> **Rascunho, a ser revisado.** Este arquivo traz, sem reescrita, o documento "Overload: arquitetura, segurança e roadmap" (Claude Docs, revisão 19, de 24/10/2026). A arquitetura ainda será revisada, então **não vale como decisão** até a revisão (#24 e #32). Os dois diagramas do documento original (arquitetura do v2 e roadmap) não foram exportados e aparecem como notas.

# Overload: arquitetura, segurança e roadmap

2026-10-22 · @Igor

## Onde estamos

O v1 funciona, mas tem quatro falhas que deixam qualquer pessoa virar admin ou mandar e-mail em nome do Overload, e precisam ser fechadas antes de qualquer trabalho no v2. A leitura foi feita no código do ultima-weapon enviado em 20 de outubro; o repositório novo IgorOlive11/overload ainda não foi lido.

**Stack do v1.** React 18 com Vite 5, Tailwind e Zustand, que guarda o estado no localStorage. É um PWA (vite-plugin-pwa) publicado na Vercel em overload.app.br. O backend é Supabase: Auth, Postgres com RLS, Storage para os GIFs e cinco Edge Functions (get-student-data, save-student-data, schedule-rest-push, send-email com Resend e send-feedback). O cronômetro de descanso usa web push com chaves VAPID.

**Modelo de dados.** A tabela user\_data guarda o estado inteiro de cada seção do app como um JSON por usuário, e a sincronização grava o bloco inteiro com upsert depois de um atraso. Quem grava por último vence, então dois aparelhos abertos podem apagar o treino um do outro. O histórico de exercício é chaveado pelo nome.

| Achado | Onde está | O que permite | Gravidade |
| --- | --- | --- | --- |
| O gatilho de cadastro copia o papel de raw\_user\_meta\_data, que vem do próprio app | migration create\_user\_data, função handle\_new\_user | Criar conta já como admin passando o papel no cadastro | Crítica |
| A política own\_profile vale para todas as operações no próprio perfil | migration create\_user\_data | Mudar o próprio papel para admin depois do cadastro | Crítica |
| A política admin\_all\_profiles confere o papel no user\_metadata do token, que o usuário edita com updateUser | migration create\_user\_data; a correção posterior só trocou a política de user\_data | Editar o perfil de qualquer pessoa | Crítica |
| A função send-email não confere a assinatura Standard Webhooks que o Supabase exige nos hooks HTTP | supabase/functions/send-email | Disparar e-mails com o visual do Overload e um link qualquer, o que serve para phishing | Alta |
| Gravação do estado inteiro por último vence | src/hooks/useStore.js | Perder treinos quando há dois aparelhos ou rede instável | Alta |
| schedule-rest-push segura cada chamada aberta por até 600 segundos | supabase/functions/schedule-rest-push | Qualquer conta logada consome o limite de execução das funções com chamadas repetidas | Média |
| Edge Functions respondem a qualquer origem (CORS "\*") | as cinco funções | Chamadas a partir de qualquer site, um padrão permissivo que a skill insecure-defaults aponta | Média |
| Qualquer conta logada lê todos os perfis | política read\_profiles | Ver nome e papel de todo mundo que usa o app | Média |

As três falhas críticas são do mesmo tipo que o documento de regras de negócio já marcou como "falha de segurança". A documentação do Supabase confirma que raw\_user\_meta\_data pode ser alterado pelo próprio usuário e não serve para autorização.

## As skills de segurança

As skills de Dweinstein cobrem o app móvel pelo padrão OWASP MASVS v2, e as da Trail of Bits cobrem o código, as dependências e o pipeline. Pela classificação da NowSecure que a skill mobile-threat-model usa, o Overload é nível 2: tem contas e dados pessoais, mas não é banco nem saúde. Esse nível define quais controles são obrigatórios na seção de segurança do app móvel.

| Skill | O que faz | Fase em que entra |
| --- | --- | --- |
| mobile-threat-model | Modelo de ameaças STRIDE ligado aos controles MASVS, com o nível de risco da NowSecure | Fundação do v2, antes do primeiro código do app |
| masvs-checklist | Lista de verificação MASVS com os testes MASTG de cada controle | Fundação, e conferida de novo antes de mandar para as lojas |
| secure-storage-audit, auth-assessment, network-security-check, platform-interaction-review, privacy-audit, code-quality-scan | Auditoria de cada grupo do MASVS no código | Empacotamento móvel |
| crypto-review, resilience-assessment | Criptografia e proteção contra engenharia reversa | Só se aparecer algo de nível 3; o Overload não tem criptografia própria |
| mobile-pentest-plan | Plano de teste de invasão pela metodologia MASTG | Antes de publicar nas lojas |
| insecure-defaults (Trail of Bits) | Encontra padrões permissivos, como CORS aberto, segredos de reserva e segurança que falha aberta | Agora, no v1, e em toda revisão de Edge Function |
| static-analysis: semgrep, codeql, sarif-parsing | Análise estática e rastreio de dados não confiáveis | Integração contínua desde a fundação |
| supply-chain-risk-auditor | Dependências com falhas conhecidas, pacotes abandonados e scripts de instalação | Fundação e a cada dependência nova |
| differential-review | Revisão de segurança de cada pull request | Todo pull request |
| sharp-edges | APIs e configurações fáceis de usar errado | Desenho do schema e das funções |
| open-sourcing | Prepara um repositório público: licença, segredos no histórico, releases | Fundação, porque o projeto é aberto |
| property-based-testing | Testes que cobrem todo o domínio de entrada | Regras de progressão e importação de CSV |
| agentic-actions-auditor | Segurança de GitHub Actions que rodam agentes de IA | Se o repositório usar Claude ou outro agente no CI |

O artigo da Snyk faz um alerta que vale aqui: a pesquisa ToxicSkills achou injeção de prompt em 36% das skills testadas. Li o SKILL.md das skills acima antes de citá-las. A regra para instalar qualquer uma é a mesma de qualquer dependência: ler o arquivo e os scripts, e desconfiar de quem pede acesso ao terminal.

## Arquitetura para chegar às lojas

A decisão é Capacitor: o mesmo código React e TypeScript roda como PWA e vira app de iOS e Android. Com isso, o 3D em Babylon, a pixel art em CSS e as animações do mock continuam valendo. As outras duas opções exigiriam reescrever a interface.

| Caminho | O que reaproveita do mock | O que custa |
| --- | --- | --- |
| Capacitor | Tudo: o app roda numa WebView nativa, com plugins para notificação local, Keychain, Keystore e vibração | A Apple recusa app que parece site empacotado (diretriz 4.2), então precisa de recursos de app de verdade |
| React Native com Expo | A lógica em TypeScript; a interface e o 3D precisam ser refeitos | Reescrever as telas e trocar o Babylon por outra solução de 3D |
| Nativo, Swift e Kotlin | Só as regras de negócio | Dois códigos separados para uma pessoa manter |

Para não cair na diretriz 4.2, o app usa o que um site não faz bem: treino inteiro offline, cronômetro de descanso com notificação local do próprio aparelho, vibração no fim do descanso e sessão guardada no Keychain e no Keystore. A notificação local também resolve a função schedule-rest-push, que hoje segura uma chamada aberta por até 10 minutos só para avisar o fim do descanso.

**Sem Mac.** O app de iOS só é compilado e assinado com o Xcode, que roda apenas em macOS, e o simulador do iOS também. A saída é compilar na nuvem: o Codemagic dá 500 minutos por mês numa máquina macOS M2 para conta pessoal, sem custo, e envia o build assinado direto para o TestFlight. O teste é feito num iPhone de verdade pelo TestFlight. O Android não depende de Mac: o build roda no Android Studio, no Windows ou no Linux. A primeira versão de iOS só vai para a nuvem depois que a de Android estiver estável, para não gastar minutos com erro que já aparece no Android.

> Diagrama não exportado: arquitetura do v2 · aparelho, Supabase e painel admin

O app fala com o Supabase só pelo SDK, por HTTPS. O v2 não tem papel de admin nem painel admin: cada conta só enxerga os próprios dados. A chave de serviço só existe nas Edge Functions e no script que atualiza a biblioteca de exercícios, que roda fora do app.

## Backend e dados

O v2 troca os blocos de estado inteiro por tabelas, e cada série registrada vira uma linha que nunca é sobrescrita. Assim, dois aparelhos ou um treino feito sem rede não conseguem apagar um ao outro.

| Tabela | O que guarda | Quem lê e grava |
| --- | --- | --- |
| profiles | Nome de exibição | O dono lê e edita |
| exercises\_library | Biblioteca com identificador estável, músculo, equipamento e GIF | Todos leem; ninguém grava pelo app, só o script que roda fora dele |
| protocols, protocol\_days, protocol\_exercises, protocol\_sets | Protocolo com versão e fase, do jeito que o montador monta | Só o dono |
| sessions | Cada treino começado ou concluído | O dono, que só acrescenta |
| set\_logs | Cada série, com carga, repetições e quanto sobrou | O dono, que só acrescenta |

**Sem papéis.** O v2 não guarda papel nenhum. Toda política de RLS é a mesma, "só o dono", e nenhum dado enviado pelo app no cadastro muda o que a conta pode fazer. As três falhas críticas do v1 dependiam de um papel com mais poder, então não têm como se repetir.

**Sincronização offline.** Cada série registrada ganha um identificador gerado no aparelho e entra numa fila no banco local. Quando a rede volta, a fila é enviada com "inserir se não existir"; reenviar a mesma série não duplica nada. Edições de protocolo levam o número da versão em que foram feitas, e o servidor recusa a gravação se a versão mudou no meio do caminho. O app então mostra as duas versões em vez de perder uma.

**Regras no banco, não só no app.** Faixas de repetição, níveis de reserva e tipos de série viram restrições CHECK nas tabelas. Um app adulterado não consegue gravar um valor que o app oficial não grava.

**CSV no lugar do painel admin.** Para montar o protocolo de quem depende de você, você exporta o CSV e a pessoa importa na própria conta. A importação valida cada linha no app e de novo no banco, e cria um rascunho que a pessoa confirma antes de substituir o protocolo. A exportação neutraliza células que começam com =, +, - ou @, para que abrir o arquivo no Excel não execute uma fórmula escondida num nome de exercício.

**Edge Functions.**

- **excluir-conta:** apaga a conta e os dados, exigência das duas lojas.
- **enviar-email:** é o hook do Supabase Auth e confere a assinatura Standard Webhooks antes de mandar qualquer coisa pelo Resend.
- **feedback:** recebe bug ou melhoria, sem token nem dado de outra conta, se o botão ficar no v2.

Todas validam a entrada e respondem só às origens do app.

**Testes de acesso.** Cada política de RLS ganha um teste automatizado que tenta ler e gravar como o dono e como outra conta. A integração contínua roda esses testes em todo pull request, e foi justamente a falta deles que deixou as falhas do v1 passarem.

## Segurança do app móvel

No nível 2 da NowSecure, são obrigatórios os 13 controles abaixo, tirados da skill masvs-checklist. Os de nível 3, como proteção contra engenharia reversa e fixação de certificado, ficam de fora: o Overload não guarda dinheiro nem dado de saúde, e o código já é aberto.

| Controle | O que significa no Overload | Como cumprir |
| --- | --- | --- |
| STORAGE-1: guardar dados sensíveis com segurança | O token de sessão é o dado mais sensível do aparelho | Sessão do Supabase guardada no Keychain e no Keystore por um plugin de armazenamento seguro, no lugar do localStorage |
| STORAGE-2: não vazar dados | Logs, relatório de erro e o feedback com captura de tela podem levar token ou e-mail | Remover token e e-mail dos logs e do recorte de estado do feedback; nada sensível em notificação |
| CRYPTO-1: criptografia atual | O app não tem criptografia própria | Usar só o TLS do sistema e as bibliotecas do Supabase; nenhum algoritmo escrito à mão |
| CRYPTO-2: gestão de chaves | A chave anônima do Supabase é pública por natureza; a chave de serviço, a do Resend e as VAPID não | Chaves secretas só nos segredos das Edge Functions; busca de segredos no CI e no histórico do Git |
| AUTH-1: autenticação e autorização seguras | Toda autorização acontece no servidor | Supabase Auth com fluxo PKCE nos links de e-mail; RLS "só o dono" em todas as tabelas; o v2 não tem papéis |
| AUTH-2: autenticação local | O app não usa biometria | Não se aplica enquanto não houver Face ID; se entrar, só para destravar a sessão guardada |
| NETWORK-1: tráfego protegido | Todo acesso é ao Supabase e ao armazenamento dos GIFs | Só HTTPS; manter os padrões do iOS (ATS) e bloquear tráfego sem criptografia no Android |
| PLATFORM-1: comunicação entre apps | Os links de confirmação e de troca de senha abrem o app | Universal Links e App Links com domínio verificado; o app confere cada parâmetro do link; lista de endereços de retorno fechada no Supabase |
| PLATFORM-2: WebView segura | No Capacitor, o app inteiro é uma WebView | Carregar só os arquivos empacotados, nunca uma URL remota; política de conteúdo (CSP) sem eval; links externos abrem no navegador do sistema |
| CODE-3: sem componentes vulneráveis | O v1 tem 13 dependências diretas, e o Capacitor traz mais | Dependabot e a skill supply-chain-risk-auditor a cada dependência nova |
| CODE-4: validar toda entrada | Importação de CSV, campos digitáveis e chamadas das Edge Functions | Validação no app e de novo no servidor, com as restrições CHECK do banco como última barreira; a exportação de CSV neutraliza fórmulas |
| PRIVACY-1: acessar o mínimo | O app precisa de nome, e-mail e dados de treino | Nenhum SDK de anúncio ou rastreamento; nenhuma permissão além de notificação |
| PRIVACY-3: transparência | Quem usa precisa saber o que é coletado | Política de privacidade em português, rótulos de privacidade da Apple e seção de segurança de dados do Google preenchidos com o mesmo conteúdo |

Antes de enviar para as lojas, as skills de auditoria do MASVS rodam sobre o código do app empacotado, e o plano da skill mobile-pentest-plan vira a lista de testes manuais. Cada achado passa pela skill fp-check antes de virar tarefa, para não perder tempo com falso positivo.

## Lojas e lei

As duas lojas exigem exclusão de conta dentro do app, e o Google exige um teste fechado de 14 dias antes da primeira publicação. Os amigos e a família que já usam o v1 são justamente esse grupo de teste.

| Requisito | Fonte | O que o Overload precisa fazer |
| --- | --- | --- |
| O app precisa ir além de um site empacotado | Apple, diretriz 4.2 | Treino offline, notificação local do descanso, vibração e navegação de app, como na seção de arquitetura; conta de demonstração para quem revisa |
| Excluir a conta começando dentro do app, com os dados, não só desativar | Apple, diretriz 5.1.1(v) | Botão "Excluir conta" nas configurações, com confirmação, que chama a função excluir-conta |
| Caminho de exclusão dentro do app e também um link na web | Google Play, exigência de exclusão de conta | O mesmo botão e uma página em overload.app.br para pedir a exclusão, cadastrada no Play Console |
| Manifesto de privacidade com o motivo de cada API sensível, desde 1º de maio de 2024 | Apple, pela documentação do Capacitor | Arquivo PrivacyInfo.xcprivacy; o plugin de preferências usa UserDefaults, com o motivo CA92.1 |
| Teste fechado com pelo menos 12 pessoas por 14 dias seguidos, para contas pessoais criadas depois de 13 de novembro de 2023 | Google Play Console | Convidar os usuários do v1 para o teste fechado e manter todos inscritos os 14 dias |
| Taxas | Splitmetrics | Apple: US$ 99 por ano; Google: US$ 25 uma vez |
| Dado referente à saúde é dado pessoal sensível | LGPD, art. 5º, II | Carga e repetição não são dado de saúde. A dieta do v1, que guarda nutrição e peso, não volta no v2, então o Overload não trata dado de saúde |
| Dado de criança exige consentimento de um dos pais | LGPD, art. 14 | Idade mínima de 18 anos, confirmada no cadastro sem pedir a data de nascimento |
| Direito de acesso, portabilidade e eliminação | LGPD, art. 18 | Exportar os dados (o CSV já existe) e excluir a conta |

A política de privacidade em português serve as três frentes ao mesmo tempo: o rótulo de privacidade da Apple, a seção de segurança de dados do Google e a transparência que a LGPD pede. Ela deve dizer quem é o responsável, o que é coletado, para quê, com quem é compartilhado (Supabase e Resend) e como pedir a exclusão. Este documento não substitui orientação jurídica: antes de publicar, vale uma revisão da política por alguém da área.

## Migração do v1

A decisão é usar o mesmo projeto Supabase, com tabelas novas ao lado das antigas, porque assim cada pessoa entra no v2 com o mesmo e-mail e a mesma senha. Um projeto novo exigiria copiar os usuários do Auth com os hashes de senha, um passo a mais que pode dar errado.

1. **Fechar as falhas do v1 em produção, antes de tudo.** O gatilho de cadastro passa a criar todo mundo como aluno. A política do próprio perfil deixa de permitir mudar o papel. A política de admin passa a ler o papel numa tabela que só o servidor grava. A função send-email passa a conferir a assinatura. Isso vale mesmo que o v2 demore, porque o v1 está no ar com pessoas de verdade.
2. **Conferir se alguém já se aproveitou disso.** Listar todas as contas com papel diferente de aluno e confirmar uma a uma.
3. **Criar as tabelas do v2 no mesmo projeto,** com RLS e testes desde o primeiro dia. As tabelas do v1 continuam funcionando enquanto o v1 está no ar.
4. **Script de migração por usuário.** O protocolo sai do JSON e entra nas tabelas novas, do mesmo jeito que a importação de CSV já faz. O histórico, que era chaveado por nome, é ligado à biblioteca pelo identificador. O que não tiver correspondência segura vai para um relatório, em vez de ser adivinhado.
5. **Rodar o script primeiro na sua conta,** comparar o resultado com o v1 e só depois rodar para os outros.
6. **Convivência.** O v1 continua em overload.app.br e ganha um aviso apontando para o v2. Depois da migração de cada pessoa, o v1 fica só leitura para ela.
7. **Desligar o v1** quando todos tiverem migrado: as tabelas antigas viram arquivo e as funções antigas saem do ar.

O que não passa para o v2 fica registrado no relatório de cada pessoa:

- os papéis de treinador e de admin, que saíram do v2;
- as semanas além da primeira, que o v2 trata como fase;
- os tipos de série que saíram;
- a dieta, que não volta.

## Roadmap

A primeira fase é fechar o v1, que está no ar; só depois vem o v2. O app vai para as lojas depois de rodar como PWA com os usuários de hoje, porque é aí que aparece o que quebra.

> Diagrama não exportado: roadmap · 7 fases, cada uma com o critério para seguir

Cada fase só termina quando o critério à direita é cumprido. As fases não têm data porque o ritmo depende do seu tempo livre; o próximo passo do roadmap é transformar cada fase em issues no GitHub Projects.

## Custos

Os valores em dólar foram convertidos pela PTAX de 14 de outubro de 2026, R$ 5,04, mais o IOF de 3,5% que incide em compra internacional no cartão de crédito. O app é gratuito e sem fins lucrativos, então as taxas das lojas sobre vendas não se aplicam.

| Item | Quanto custa | Quando se paga | O que justifica |
| --- | --- | --- | --- |
| Apple Developer Program | US$ 99, cerca de R$ 517 | Todo ano | Sem a inscrição não dá para publicar na App Store nem distribuir pelo TestFlight. A isenção da taxa só vale para organizações sem fins lucrativos reconhecidas, instituições de ensino e governo, não para pessoa física. A Apple pode cobrar em reais; o valor exato aparece na tela de pagamento da inscrição. |
| Conta do Google Play | US$ 25, cerca de R$ 131 | Uma vez só | A taxa é por conta, não por app, e não tem renovação anual. |
| Build de iOS no Codemagic | Zero | Todo mês | A conta pessoal tem 500 minutos por mês numa máquina macOS M2. Um build de Capacitor costuma levar poucos minutos, então a cota cobre dezenas de builds por mês. |
| Supabase no plano gratuito | Zero | Todo mês | O plano cobre 50 mil usuários ativos por mês, 500 MB de banco e 1 GB de arquivos, muito acima do uso dos amigos e da família. O projeto pausa depois de uma semana sem uso, e o plano não tem backup automático. |
| Supabase no plano Pro | US$ 25, cerca de R$ 130 por mês | Todo mês, a partir da publicação nas lojas | O Pro traz backup diário guardado por 7 dias e nunca pausa o projeto. Depois que o app estiver nas lojas, perder o histórico de treino de alguém por falta de backup é o risco que este custo evita. |
| Resend | Zero | Todo mês | O plano gratuito manda 3 mil e-mails por mês, com limite de 100 por dia. O app só manda e-mail de confirmação de conta e de troca de senha. |
| Vercel no plano Hobby | Zero | Todo mês | O plano gratuito é para projeto pessoal sem fins comerciais, que é o caso do Overload. |
| Domínio overload.app.br | Cerca de R$ 40 | Todo ano | O domínio já está registrado e pago hoje, então não é custo novo. |
| GitHub, Dependabot e as skills de segurança | Zero | Nunca | O repositório é público, e as ferramentas usadas no plano são gratuitas para repositório público. |

**Total com conta pessoal.** No primeiro ano, o mínimo é cerca de R$ 690: a Apple, o Google e o domínio. Com o Supabase Pro ligado no dia da publicação, um ano inteiro sobe para cerca de R$ 2.250. Do segundo ano em diante, o custo fixo é cerca de R$ 557 por ano, a Apple mais o domínio, e mais cerca de R$ 1.565 por ano se o Supabase Pro continuar ligado.

**Conta de empresa.** Ela exige CNPJ, e desenvolvimento de aplicativo não é atividade permitida para MEI. Sobra abrir uma microempresa no Simples Nacional, com contador a partir de R$ 249 por mês, cerca de R$ 3 mil por ano, além das taxas de abertura na Junta Comercial e na prefeitura. Sem faturamento, o imposto do Simples sai zero, mas o contador continua sendo pago todo mês. O D-U-N-S, que as duas lojas pedem para conta de empresa, é gratuito. Para um app gratuito feito como estudo, isso multiplica o custo por cinco só para mudar o nome que aparece na loja.

**O que fica de fora da conta.** Um iPhone para testar pelo TestFlight, caso você não tenha um, e a revisão da política de privacidade por um advogado, que depende de orçamento.

## Riscos e decisões em aberto

O maior risco não é técnico: é uma pessoa só cuidando de app, servidor, lojas e privacidade. Por isso o plano empurra o máximo possível para regras automáticas, como testes de RLS, análise estática e auditoria de dependências no CI.

| Risco | O que pode acontecer | Como reduzir |
| --- | --- | --- |
| Recusa da Apple pela diretriz 4.2 | O app ser visto como site empacotado | Recursos de app desde a primeira versão enviada, e notas para quem revisa explicando o treino offline e o cronômetro |
| Repositório aberto | Um segredo antigo no histórico do Git virar acesso ao banco | Rodar a skill open-sourcing e a busca de segredos no histórico inteiro; trocar qualquer chave que já tenha aparecido |
| Falha de autorização nova | Uma política escrita errado abrir dados de outra pessoa, como no v1 | Teste de RLS obrigatório para cada tabela nova, e a skill differential-review em todo pull request |
| Perda de treino na migração | Histórico ligado ao exercício errado | Relatório por pessoa e migração da sua conta primeiro |
| Ninguém para o teste fechado do Google | A publicação na Play Store travar | Usar os usuários do v1; o teste dura 14 dias seguidos, então eles precisam ficar inscritos até o fim |

**Decisões** **tomadas e a que falta:**

1. O v2 usa o mesmo projeto Supabase, com tabelas novas.
2. O app nativo é feito com Capacitor, e o build de iOS roda na nuvem porque não há Mac.
3. A dieta não volta, então a regra de dado de saúde da LGPD não se aplica.
4. A idade mínima para criar conta é 18 anos.
5. Ainda em aberto: conta de desenvolvedor pessoal ou de empresa nas lojas. A regra de 12 pessoas por 14 dias do Google vale para contas pessoais, e os minutos grátis do Codemagic também são só para conta pessoal. Pela seção de custos, a conta de empresa custa cerca de R$ 3 mil a mais por ano só com contador.

## Fontes

- [mobile-security-skills (Dweinstein): MASVS e MASTG](https://github.com/dweinstein/mobile-security-skills)
- [skills (Trail of Bits)](https://github.com/trailofbits/skills)
- [Snyk: melhores skills do Claude para cibersegurança](https://snyk.io/pt-BR/articles/top-claude-skills-cybersecurity-hacking-vulnerability-scanning/)
- [Supabase: Auth Hooks e verificação Standard Webhooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [GuardLayer: app\_metadata e user\_metadata no Supabase](https://www.guardlayer.io/blog/supabase-app-metadata-vs-user-metadata)
- [Apple: diretriz 5.1.1(v), exclusão de conta](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [MobiLoud: diretriz 4.2 e apps em WebView](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)
- [Capacitor: manifesto de privacidade do iOS](https://capacitorjs.com/docs/ios/privacy-manifest)
- [Google Play: requisito de teste para contas pessoais novas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Google Play: exclusão de conta](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-GB)
- [Splitmetrics: taxas da Apple e do Google](https://splitmetrics.com/blog/google-play-apple-app-store-fees/)
- [LGPD, Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Codemagic: preços e minutos grátis](https://docs.codemagic.io/billing/pricing/)
- [Capgo: desenvolver para iOS com Capacitor sem Mac](https://capgo.app/fr/blog/capacitor-ios-development-without-mac-faq/)
- [Apple: o que inclui o Apple Developer Program](https://developer.apple.com/programs/whats-included/)
- [Prime Test Lab: taxa do Google Play Console](https://primetestlab.com/pt/blog/google-play-developer-fee)
- [Supabase: planos e limites em 2026](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Resend: preços](https://resend.com/pricing.md)
- [Rankia: PTAX de 14 de outubro de 2026](https://rankia.com.br/dolar-hoje-15-outubro-2026/)
- [ARQ: IOF em compras com cartão em 2026](https://arqfinance.com/articles/?p=2031)
- [Meu Contador Online: desenvolvedor de software pode ser MEI](https://www.meucontadoronline.com.br/blog/desenvolvedor-de-software-pode-ser-mei/)
- [Meu Contador Online: quanto custa contador para ME](https://www.meucontadoronline.com.br/blog/quanto-custa-contador-para-me/)

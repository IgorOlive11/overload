# Processo de desenvolvimento

O Overload é construído por agentes de IA, com o dono do repositório no papel de Product Owner. Este documento descreve o processo. As regras que os agentes seguem estão no [AGENTS.md](../../AGENTS.md). O Claude Code lê esse arquivo pelo `CLAUDE.md`, e outras ferramentas que seguem o padrão AGENTS.md leem diretamente.

## Quem faz o quê

- **Product Owner (PO):** escreve e refina as issues, prioriza, aprova o plano de cada tarefa, decide as perguntas que os agentes levantam e faz o merge.
- **Agente de implementação:** lê a issue, publica um plano, espera a aprovação, implementa, escreve os testes e abre o pull request.
- **Agente revisor:** um subagente que não participou da implementação e confere o pull request contra a issue. O parecer vai colado no pull request.

## O ciclo de uma issue

1. Toda mudança começa numa issue, aberta com um dos modelos: história, tarefa, bug, spike ou épico.
2. A issue só pode ser trabalhada quando tem a etiqueta `pronta-para-agente` e nenhum bloqueio aberto.
3. O agente lê a issue e as fontes que ela cita, e publica um plano como comentário, com o entendimento, os arquivos, os testes, o que fica fora do escopo e as dúvidas. Ele para e espera.
4. O PO aprova o plano numa nova menção.
5. O trabalho acontece num branch `agente/<número>-<assunto>`, nunca na `master`.
6. Cada critério de aceite vira um teste, com o texto do critério no nome. Em pull request só de documento ou de spike, a conferência é uma lista com o comando ou a leitura que comprova cada critério.
7. O revisor confere o trabalho. Se o veredito for voltar para ajuste, o agente ajusta antes de abrir o pull request.
8. O pull request cita a issue, segue o modelo do repositório, traz o parecer do revisor e só entra com o CI verde e a aprovação do PO.
9. Pull request que mexe em `AGENTS.md`, `CLAUDE.md`, `.claude/` ou `.github/`, ou que altera mais de 400 linhas, não é mergeado no mesmo dia em que foi aberto. Arquivos gerados por comando, como o build do mock, não contam nas 400 linhas.

## Pronta para o agente

Uma issue está pronta quando:

- cita a regra de negócio em `docs/produto` e, se for de tela, a captura do mock em `design/mock/telas`;
- tem critérios de aceite testáveis, sem cenários óbvios ou repetidos;
- diz o que fica fora do escopo;
- não deixa nenhuma decisão de produto para quem vai implementar;
- não tem nenhuma issue bloqueante ainda aberta.

## Etiquetas e o quadro

O backlog vive no GitHub Projects. O PO move a issue para a coluna "Pronta para agente", e um workflow põe a etiqueta `pronta-para-agente` em até cinco minutos. O agente só enxerga a etiqueta, não os campos do quadro. A etiqueta `tarefa-do-po` marca o que só o PO faz, como criar contas e cadastrar segredos, e nunca recebe `pronta-para-agente`.

As issues se organizam em fases (milestones), épicos, e histórias, tarefas, bugs e spikes dentro deles. As dependências usam o bloqueio nativo do GitHub. O [mapa de execução](https://github.com/IgorOlive11/overload/issues/63) desenha tudo isso e se atualiza sozinho.

## Decisões e perguntas

Decisões e perguntas ao PO são respondidas no comentário da issue, antes do pull request. O registro em `docs/decisoes` só entra como aceito ou rejeitado com a resposta do PO e o link do comentário dele. Sem resposta, entra como proposta.

## Arquivos que o agente não edita sozinho

O gancho `.claude/hooks/proteger-arquivos.mjs` pede confirmação de uma pessoa para mudar `AGENTS.md`, `CLAUDE.md`, `.claude/` e `.github/workflows/`, e nega a edição de migrações já existentes. O agente que roda no GitHub Actions não tem como confirmar, então essas mudanças são feitas pelo PO ou numa sessão em que ele confirme.

## Como o agente roda

- **No GitHub Actions**, quando o PO comenta `@claude` numa issue. Cada menção é uma execução: o agente publica o plano e termina, e a aprovação chega numa nova menção. As execuções entram numa fila única.
- **Numa sessão na nuvem do Claude Code**, para tarefas maiores ou que mexem nos arquivos protegidos.

## Armadilhas conhecidas

Coisas que já deram errado e como evitar:

- Um token colado com a quebra de linha do terminal ganha um espaço no meio e a autenticação falha.
- No Actions, cada comando que o agente usa precisa estar nas ferramentas liberadas do workflow.
- A action não consegue alterar `.github/workflows/`.
- Um pull request aberto com o token padrão do Actions não dispara o CI.
- O Projects de conta pessoal não gera evento para o Actions, por isso o workflow de sincronização também roda por agendamento.
- Várias menções ao agente em poucos segundos cancelam as execuções intermediárias, porque a fila guarda uma só esperando.
- Uma issue liberada precisa ser relida contra as issues abertas: o que os critérios pedem que ainda não existe é um bloqueio que falta marcar.

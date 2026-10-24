# Como contribuir

O Overload é construído por agentes de IA, com o dono do repositório no papel de Product Owner. Contribuições de pessoas e de agentes seguem o mesmo fluxo.

## Fluxo

1. Toda mudança começa numa issue, aberta com um dos modelos do repositório: história, tarefa, bug ou spike.
2. A issue só pode ser trabalhada quando tiver a etiqueta `pronta-para-agente` e nenhum bloqueio aberto. O dono do repositório põe a etiqueta ao mover a issue para Pronta para o agente no GitHub Projects; o agente confere a etiqueta, porque não lê os campos do Projects.
3. O trabalho acontece num branch `agente/<número>-<assunto>`, nunca na `master`.
4. O pull request cita a issue, segue o modelo do repositório e só entra com o CI verde e a aprovação do dono do repositório.

## Pronta para o agente

Uma issue está pronta quando:

- cita a regra de negócio em `docs/produto` e, se for de tela, a captura do mock em `design/mock/telas`;
- tem critérios de aceite testáveis, sem cenários óbvios ou repetidos;
- diz o que fica fora do escopo;
- não deixa nenhuma decisão de produto para quem vai implementar;
- não tem nenhuma issue bloqueante ainda aberta.

## Usando um agente

As regras para agentes estão no [AGENTS.md](AGENTS.md). O Claude Code lê esse arquivo pelo `CLAUDE.md`, e outras ferramentas que seguem o padrão AGENTS.md leem diretamente.

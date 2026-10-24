# Overload

[![Licença: AGPL-3.0-or-later](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0--or--later-blue.svg)](LICENSE)

App de treino em PWA, aberto e sem fins lucrativos, para que qualquer pessoa tenha acesso a um treino bem estruturado. O produto tem dois focos: garantir que a pessoa mantenha o treino e garantir que a carga progrida de forma segura ao longo do tempo. O visual é inspirado em Doom, com Doom faces e pixel art próprias.

## Status

Em reconstrução. Esta é a versão 2 do Overload, refeita do zero a partir de um mock de alta fidelidade e de um documento de regras de negócio. O planejamento está no GitHub Projects do repositório, organizado em épicos, histórias, tarefas, bugs e spikes.

## Como o projeto é construído

O desenvolvimento é feito por agentes de IA, com o dono do repositório no papel de Product Owner: ele escreve e refina as issues, aprova o plano de cada tarefa e testa cada entrega antes do merge. As regras que os agentes seguem estão no [AGENTS.md](AGENTS.md), e as decisões de produto e de arquitetura ficam registradas em [docs/decisoes](docs/decisoes).

## Rodar localmente

1. Instale as dependências com `npm ci`.
2. Copie o `.env.example` para `.env` e preencha com os dados de um projeto Supabase de desenvolvimento.
3. Rode `npm run dev`.

## Documentação

- [docs/produto](docs/produto): visão e regras de negócio.
- [docs/tecnico](docs/tecnico): arquitetura e segurança.
- [docs/decisoes](docs/decisoes): registro das decisões.
- [design](design): mock e assets visuais.

## Licença

O Overload é software livre, distribuído sob a licença [GNU Affero General Public License v3.0 ou posterior (AGPL-3.0-or-later)](LICENSE). A decisão está registrada em [docs/decisoes/0001-licenca-agpl-3-0-or-later.md](docs/decisoes/0001-licenca-agpl-3-0-or-later.md).

## Contribuir e segurança

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Para relatar uma falha de segurança, siga o [SECURITY.md](SECURITY.md) em vez de abrir uma issue pública.

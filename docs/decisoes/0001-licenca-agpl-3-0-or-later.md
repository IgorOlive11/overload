# Licenciar o Overload com a AGPL-3.0-or-later

- Status: aceita
- Data: 2026-10-24
- Quem decidiu: IgorOlive11 (dono do repositório)

## Contexto e problema

O repositório é público, mas não tinha licença. Sem ela, ninguém tem permissão clara para usar, estudar ou modificar o código. O Overload é um app web (PWA) com Edge Functions, então o código roda em servidores e é usado pela rede, sem que a pessoa receba uma cópia.

## O que pesou na decisão

- O projeto é aberto e sem fins lucrativos; o código deve continuar aberto em qualquer versão derivada.
- Uso em rede: quem hospedar uma versão modificada deve oferecer o código dela aos usuários.
- Reconhecimento por ferramentas automatizadas de conformidade, com identificador SPDX.
- Texto oficial e sem alterações, para não haver dúvida jurídica.

## Opções consideradas

1. AGPL-3.0-or-later.
2. GPL-3.0-or-later: copyleft forte, mas não cobre o uso apenas pela rede.
3. MPL-2.0: copyleft por arquivo, deixa fechar versões derivadas do app.
4. MIT ou Apache-2.0: permissivas, permitem fechar versões derivadas.

## Decisão

AGPL-3.0-or-later, pelo copyleft forte que alcança o uso em rede. O texto integral está no `LICENSE` na raiz, copiado sem alteração do SPDX license-list-data: `https://raw.githubusercontent.com/spdx/license-list-data/main/text/AGPL-3.0-or-later.txt`. O identificador `AGPL-3.0-or-later` também está no campo `license` do `package.json`. Não haverá cabeçalho de licença por arquivo por enquanto, porque o `LICENSE` na raiz cobre o repositório inteiro.

## Consequências

- Bom, porque versões derivadas, inclusive hospedadas como serviço, precisam continuar abertas.
- Bom, porque o identificador SPDX permite que ferramentas reconheçam a licença.
- Ruim, porque empresas que não querem copyleft tendem a evitar o código.
- Ruim, porque contribuições passam a ser licenciadas sob a mesma licença.

## Como conferir

- Existe `LICENSE` na raiz, idêntico ao arquivo do SPDX citado acima.
- O `README.md` tem o badge e a seção Licença.
- O `package.json` tem `"license": "AGPL-3.0-or-later"`.

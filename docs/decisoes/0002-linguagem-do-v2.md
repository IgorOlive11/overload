# Escrever o v2 em TypeScript, só com sintaxe que o Node consegue apagar

- Status: aceita
- Data: 2026-10-25
- Quem decidiu: IgorOlive11 (PO), em 2026-10-25, a partir da proposta da spike #22

## Contexto e problema

A V1 (repositório ultima-weapon) é toda em JavaScript, menos as Edge Functions, que já são TypeScript no Deno. O rascunho de arquitetura (`docs/tecnico/rascunho-arquitetura.md`) prevê TypeScript, mas em parte porque o mesmo código iria para iOS e Android pelo Capacitor, caminho que foi descartado (#28). O v2 agora é só PWA, e a escolha precisa ser feita antes da base do app (#36) e da arquitetura (#32).

O custo de trocar agora é pequeno: o `src/` atual tem cerca de 140 linhas (login, `useAuth`, `useStore` e `supabase.js`), e o código da V1 não vai ser copiado em bloco (veja o registro de aproveitamento da V1, desta mesma spike).

## O que pesou na decisão

- As regras de progressão e de carga ficam em `src/domain` e precisam passar nos casos de `tests/oraculo`. Tipos nas entradas e saídas dessas funções evitam erros que o oráculo só pegaria por acaso: carga por mão ou total, kg contra repetições, faixa como texto `"8-12"` (como na V1) ou como par de números.
- O banco do v2 troca o JSON por seção por tabelas (`protocols`, `sessions`, `set_logs` e as outras). O comando `supabase gen types typescript` gera os tipos das tabelas a partir das migrações, e o app passa a quebrar no build quando uma coluna muda.
- A maior parte do código vai ser escrita por agentes. Com o `tsc` no CI, um erro de tipo aparece no pull request, antes da revisão.
- O que já está pronto para TypeScript:
  - o Vite 8 compila `.ts` e `.tsx` sem plugin;
  - `@types/react` e `@types/react-dom` já estão no `package.json`;
  - o CodeQL (`.github/workflows/codeql.yml`) já analisa `javascript-typescript`;
  - as Edge Functions já são TypeScript.
- Os testes rodam no runner do Node, sem dependência. Do Node 22.18 em diante, o Node remove os tipos de `.ts` sem nenhum passo de build. A spike conferiu no Node 22.22 deste ambiente: um `node --test a.test.ts` com anotações de tipo passou. Um arquivo com `enum` falhou, porque só a sintaxe que pode ser apagada funciona. O TypeScript 5.8 tem a opção `erasableSyntaxOnly`, que barra essa sintaxe no `tsc`.
- O Node não entende JSX. Com isso, os testes que rodam direto no Node só alcançam `src/domain` e `src/lib`, o que já é a regra do `AGENTS.md` para o domínio: sem React. A interface é testada pelos testes de ponta a ponta.
- O mock (`design/mock/*.js`) é JavaScript, mas é a referência das regras, não código que vai ser copiado. A língua dele não pesa.
- São duas dependências de desenvolvimento novas, e o `AGENTS.md` pede justificativa para cada uma no pull request.

## Opções consideradas

1. TypeScript desde a base do v2, com `strict` e `erasableSyntaxOnly`, checado pelo `tsc --noEmit` no CI.
2. JavaScript com tipos em comentários JSDoc e `checkJs` no `tsc`. Pega parte dos erros, mas as anotações ficam verbosas e os tipos gerados do Supabase só entram por `import()` em comentário.
3. Continuar em JavaScript puro, como a V1. Não muda nada agora, mas os erros de unidade e de formato de dado só aparecem nos testes ou em produção.

## Decisão

A recomendação é a opção 1: TypeScript desde a base do v2, só com a sintaxe que o Node consegue apagar. O ganho está no domínio e no acesso ao banco, que são as partes com mais regra. O custo é uma configuração feita uma vez e duas dependências de desenvolvimento. A conversão do `src/` atual é quase de graça, porque ele vai ser substituído de qualquer forma.

## Consequências

Se a recomendação for adotada, a issue que executar a troca muda:

- `package.json`: entram `typescript` e `typescript-eslint` como dependências de desenvolvimento, com justificativa no pull request. Entra também um script `typecheck` (`tsc --noEmit`) e o campo `engines.node` com `>=22.18`, a versão a partir da qual o Node remove os tipos sem opção.
- lint: o `eslint.config.js` passa a cobrir `**/*.{ts,tsx}` com as regras do `typescript-eslint`, mantendo os plugins de React que já estão lá.
- build: entra um `tsconfig.json` com `strict`, `erasableSyntaxOnly`, `noEmit` e `allowImportingTsExtensions`, porque o Node exige a extensão `.ts` nos imports. O `vite.config.js` não muda, e o `vite build` não checa tipos, então o CI ganha o passo `npm run typecheck` antes do build.
- testes: o glob do `npm test` passa a incluir `tests/**/*.test.ts`. Os casos de `tests/oraculo` e os testes de `src/domain` podem ser escritos em TypeScript. Os testes atuais em `.mjs` continuam como estão.
- `AGENTS.md`: a seção Stack ganha o TypeScript, e a seção Comandos ganha o `npm run typecheck`.
- Bom, porque mudar uma coluna do banco ou a forma de uma regra quebra o build no pull request, e não em produção.
- Bom, porque as Edge Functions e o app passam a falar a mesma língua.
- Ruim, porque `enum`, `namespace` e parâmetros de construtor com modificador ficam proibidos. Isso é um detalhe que pega quem vem do TypeScript comum.
- Ruim, porque os tipos gerados do banco precisam ser gerados de novo a cada migração, um passo a mais no fluxo da skill `nova-tabela`.

## Como conferir

- Existe `tsconfig.json` com `strict` e `erasableSyntaxOnly`.
- O CI roda `npm run typecheck` e falha com erro de tipo.
- `src/domain` não tem arquivos `.js` nem `.jsx`.

## Issues de acompanhamento sugeridas

- Configurar o TypeScript no v2: `tsconfig.json`, `typescript-eslint`, script `typecheck` no CI e `engines.node`. Deve entrar antes ou junto da base do PWA (#36).
- Gerar os tipos do banco com `supabase gen types typescript` e acrescentar esse passo à skill `nova-tabela`. Depende da configuração do Supabase de desenvolvimento (#30).

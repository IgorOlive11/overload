# Mock do Overload

O mock de alta fidelidade do app, em partes pequenas para o agente achar o que precisa por busca. Os valores exatos de texto, CSS e lógica estão aqui. Não há base64 nesta pasta: sprites, texturas e fontes são arquivos em `design/assets`.

## Partes

| Arquivo | O que tem |
|---|---|
| `estrutura.html` | Marcação das telas (Hoje, Treino, Progresso, Plano), abas, modal e camadas |
| `estilos.css` | Todo o CSS do mock |
| `fontes.css` | `@font-face` das fontes de `design/assets/fontes` |
| `regras.js` | Regras de progressão e carga, tipos de série, biblioteca de exercícios e planos de exemplo |
| `sessao.js` | Sessão de treino: reel de passos, série, descanso e fim de sessão |
| `doom-face.js`, `doom-face-vivas.js` | Doom faces, texto de cada nível de esforço e as faces que reagem |
| `cena-3d.js` | Barra, anilhas e máquinas em 3D (Babylon.js) |
| `armas.js` | Pistola e escopeta em pixel art |
| `plano-fase.js`, `plano-montador.js`, `plano-simples.js` | Plano: fase atual e montagem de protocolo |
| `csv.js` | Importar e exportar protocolo em CSV |
| `primeiro-acesso.js`, `guia.js` | Conta nova, cadastro e o Doomguy que guia |
| `navegacao.js`, `hoje.js`, `progresso.js`, `nucleo.js`, `boot.js` | Navegação, tela Hoje, Progresso, utilitários e inicialização |
| `index.template.html` | Esqueleto do HTML final |
| `build.mjs` | Monta o HTML completo |

As partes de JS não são módulos. Formam um único script, na ordem da lista `SCRIPTS` em `build.mjs`, e compartilham as mesmas variáveis. Por isso o ESLint ignora `design/`.

## Build

```bash
node design/mock/build.mjs
```

Gera `design/mock/dist/index.html` e `design/mock/dist/babylon-mini.js`. O HTML embute sprites, texturas e fontes (cada `@asset(pasta/arquivo)` nas partes vira um data URI). Abra o `index.html` por um servidor local, por exemplo `npx serve design/mock/dist`. A pasta `dist` não é versionada. O HTML carrega o GSAP de um CDN, como o mock publicado.

## Referências visuais

```bash
npm run mock:telas
```

Equivale a `node design/mock/capturar.mjs`. Roda o build e grava em `design/mock/telas` uma imagem por tela e por estado, com o nome `<tela>-<estado>.png` (por exemplo `treino-descanso.png`). Essas imagens são as referências do teste de comparação visual e da revisão humana. O agente não as usa para construir a tela: para isso ele lê as partes do mock.

A captura é reproduzível: viewport de 390 px de largura, animações desligadas, relógio fixo em 5 de janeiro de 2026, `Math.random` com semente e o GSAP servido do pacote npm `gsap` (mesma versão do CDN), sem rede. Rodar duas vezes no mesmo ambiente gera imagens idênticas. O navegador muda o desenho dos pixels de uma máquina para outra, então regenere as imagens no mesmo ambiente em que for compará-las.

Precisa do Chromium do Playwright: `npx playwright install chromium`.

## Versão

Corresponde ao mock publicado sem o painel de administração, que saiu do MVP. O texto "Fora do MVP" da lateral continua citando os papéis de treinador e de admin, como na versão publicada.

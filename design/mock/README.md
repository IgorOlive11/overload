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

## Versão

Corresponde ao mock publicado sem o painel de administração, que saiu do MVP. O texto "Fora do MVP" da lateral continua citando os papéis de treinador e de admin, como na versão publicada.

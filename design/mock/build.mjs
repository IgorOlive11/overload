// Monta o HTML completo do mock a partir das partes desta pasta.
// Uso: node design/mock/build.mjs   (gera design/mock/dist/index.html e dist/babylon-mini.js)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const assets = join(aqui, '..', 'assets')
const saida = join(aqui, 'dist')

// A ordem importa: as partes de JS formam um único script e compartilham as mesmas variáveis.
const SCRIPTS = [
  'doom-face', 'nucleo', 'regras', 'cena-3d', 'navegacao', 'hoje', 'sessao', 'progresso',
  'plano-fase', 'plano-montador', 'plano-simples', 'armas', 'csv', 'doom-face-vivas',
  'primeiro-acesso', 'guia', 'boot',
]

const MIME = {
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
}

const ler = (nome) => readFileSync(join(aqui, nome), 'utf8')

// @asset(pasta/arquivo.ext) vira um data URI com o conteúdo do arquivo em design/assets.
function embutir(texto) {
  return texto.replace(/@asset\(([^)]+)\)/g, (_, caminho) => {
    const tipo = MIME[extname(caminho)]
    if (!tipo) throw new Error(`Tipo de asset desconhecido: ${caminho}`)
    const dados = readFileSync(join(assets, caminho)).toString('base64')
    return `data:${tipo};base64,${dados}`
  })
}

const scripts = SCRIPTS.map((nome) => ler(`${nome}.js`)).join('\n')
const html = ler('index.template.html')
  .replace('<!--@fontes.css-->', () => ler('fontes.css'))
  .replace('<!--@estilos.css-->', () => ler('estilos.css'))
  .replace('<!--@estrutura.html-->', () => ler('estrutura.html'))
  .replace('<!--@scripts-->', () => scripts)

mkdirSync(saida, { recursive: true })
writeFileSync(join(saida, 'index.html'), embutir(html))
copyFileSync(join(assets, 'babylon-mini.js'), join(saida, 'babylon-mini.js'))
console.log(`Mock gerado em ${join(saida, 'index.html')}`)

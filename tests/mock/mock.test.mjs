// Critérios de aceite da issue #26 para o mock. Rode com `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..')
const mock = join(raiz, 'design', 'mock')
const assets = join(raiz, 'design', 'assets')

const listar = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === 'dist' ? [] : listar(join(dir, e.name))) : [join(dir, e.name)],
  )
// As partes do mock: HTML, CSS e JS. O build.mjs e o README só descrevem o formato.
const textos = (dir) => listar(dir).filter((f) => ['.html', '.css', '.js'].includes(extname(f)))

test('Dado que o agente lê o mock por busca, quando a pasta design/mock for inspecionada, então o mock deve estar separado em partes com nome claro (estrutura das telas, estilos, regras de progressão e carga, sessão de treino e Doom face), sem nenhum conteúdo em base64', () => {
  for (const parte of ['estrutura.html', 'estilos.css', 'regras.js', 'sessao.js', 'doom-face.js']) {
    assert.ok(existsSync(join(mock, parte)), `falta design/mock/${parte}`)
  }
  for (const arquivo of textos(mock)) {
    const texto = readFileSync(arquivo, 'utf8')
    assert.doesNotMatch(texto, /;base64,/, `${arquivo} tem base64`)
    assert.doesNotMatch(texto, /data:image\//, `${arquivo} tem data URI de imagem`)
    assert.ok(statSync(arquivo).size < 100_000, `${arquivo} tem mais de 100 KB`)
  }
})

test('Dado que sprites e fontes não são texto, quando a pasta design/assets for inspecionada, então cada sprite e cada fonte usados no mock devem estar nela como arquivo próprio', () => {
  const usados = new Set()
  for (const arquivo of textos(mock)) {
    for (const [, caminho] of readFileSync(arquivo, 'utf8').matchAll(/@asset\(([^)]+)\)/g)) usados.add(caminho)
  }
  assert.ok(usados.size > 40, 'o mock devia usar dezenas de sprites, texturas e fontes')
  for (const caminho of usados) assert.ok(existsSync(join(assets, caminho)), `falta design/assets/${caminho}`)
  for (const fonte of ['amazdoom.ttf', 'jersey-10-latin-400-normal.woff2', 'vt323-latin-400-normal.woff2']) {
    assert.ok(usados.has(`fontes/${fonte}`), `o mock não usa fontes/${fonte}`)
  }
})

// Mantém o HTML gerado para os testes seguintes.
let saida
test('Dado que o mock precisa abrir como antes, quando alguém rodar o comando de build documentado em design/mock, então ele deve gerar o HTML completo do mock', () => {
  const readme = readFileSync(join(mock, 'README.md'), 'utf8')
  assert.match(readme, /node design\/mock\/build\.mjs/)
  execFileSync('node', ['design/mock/build.mjs'], { cwd: raiz })
  saida = join(mock, 'dist')
  const html = readFileSync(join(saida, 'index.html'), 'utf8')
  assert.match(html, /<title>Overload app mock<\/title>/)
  for (const tela of ['v-hoje', 'v-treino', 'v-progresso', 'v-plano']) assert.match(html, new RegExp(`id="${tela}"`))
  assert.doesNotMatch(html, /@asset\(/, 'sobrou referência a asset sem resolver')
  assert.ok(existsSync(join(saida, 'babylon-mini.js')))
})

test('Dado que o mock precisa abrir como antes, quando o HTML gerado abrir no navegador, então as quatro telas devem aparecer sem erro', async (t) => {
  let chromium
  try {
    ;({ chromium } = createRequire(import.meta.url)('playwright'))
  } catch {
    t.skip('playwright não está instalado; rode com NODE_PATH apontando para um playwright global')
    return
  }
  // Só os dois arquivos do build; o caminho pedido nunca vira caminho no disco.
  const servidos = {
    '/': ['index.html', 'text/html'],
    '/index.html': ['index.html', 'text/html'],
    '/babylon-mini.js': ['babylon-mini.js', 'text/javascript'],
  }
  const servidor = http.createServer((req, res) => {
    const servido = servidos[req.url.split('?')[0]]
    if (!servido) return res.writeHead(404).end()
    const [nome, tipo] = servido
    res.writeHead(200, { 'content-type': tipo }).end(readFileSync(join(saida, nome)))
  })
  await new Promise((ok) => servidor.listen(0, ok))
  const navegador = await chromium.launch()
  try {
    const pagina = await navegador.newPage({ viewport: { width: 430, height: 900 } })
    const erros = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    await pagina.route(/cdnjs\.cloudflare\.com/, (r) => r.abort())
    await pagina.goto(`http://localhost:${servidor.address().port}/`)
    await pagina.waitForTimeout(1500)
    for (const tela of ['hoje', 'treino', 'progresso', 'plano']) {
      await pagina.click(`.tabs [data-v="${tela}"]`)
      assert.equal(await pagina.isVisible(`#v-${tela}`), true, `a tela ${tela} não apareceu`)
    }
    assert.deepEqual(erros, [])
  } finally {
    await navegador.close()
    servidor.close()
  }
})

test('Dado que as partes que existem fora do repositório podem ser anteriores à remoção do admin, quando as partes forem commitadas, então elas devem corresponder à versão publicada sem admin, sem nenhum trecho do painel de administração', () => {
  const proibidos = [/v-admin/, /renderAdmin/, /data-v="admin"/, /STUDENTS/, /studOf/, /ctxBar/, /leaveCtx/, /editStudent/, /painel admin \*\//, /\.stud\b/, /\.csvrow/, /\.ctxbar/]
  for (const arquivo of textos(mock)) {
    const texto = readFileSync(arquivo, 'utf8')
    for (const padrao of proibidos) assert.doesNotMatch(texto, padrao, `${arquivo} ainda tem ${padrao}`)
  }
})

// Critérios de aceite da issue #27: referências visuais do mock. Rode com `npm test`.
// O teste de repetição compara duas rodadas no mesmo ambiente, e não contra os PNGs versionados,
// porque o navegador usado muda o desenho dos pixels de uma máquina para outra.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..')
const mock = join(raiz, 'design', 'mock')
const telas = join(mock, 'telas')

// Telas e estados aprovados na issue. O nome do arquivo traz a tela e o estado.
const ESPERADAS = [
  'primeiro-acesso-cadastro', 'primeiro-acesso-boas-vindas',
  'hoje-sem-treino-feito', 'hoje-com-treino-feito',
  'treino-antes-de-comecar', 'treino-serie', 'treino-descanso', 'treino-esforco', 'treino-fim-da-sessao',
  'progresso',
  'plano-fase-atual', 'plano-montador', 'plano-importacao-csv',
].map((n) => `${n}.png`)

// Largura gravada no cabeçalho IHDR do PNG.
const larguraPng = (arquivo) => readFileSync(arquivo).readUInt32BE(16)

async function temNavegador() {
  try {
    const { chromium } = await import('@playwright/test')
    return existsSync(chromium.executablePath())
  } catch {
    return false
  }
}

const hashes = (dir) =>
  Object.fromEntries(
    readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
      .map((f) => [f, createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')]),
  )

test('Dado que as referências precisam acompanhar o mock, quando alguém rodar o comando documentado em design/mock, então ele deve gerar uma imagem por tela e por estado relevante do mock em design/mock/telas, com o nome da tela e do estado no nome do arquivo', () => {
  const readme = readFileSync(join(mock, 'README.md'), 'utf8')
  assert.match(readme, /npm run mock:telas/)
  assert.match(readme, /node design\/mock\/capturar\.mjs/)
  const pacote = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'))
  assert.equal(pacote.scripts['mock:telas'], 'node design/mock/capturar.mjs')
  const geradas = readdirSync(telas).filter((f) => f.endsWith('.png')).sort()
  assert.deepEqual(geradas, [...ESPERADAS].sort())
})

test('Dado que o teste compara imagens de duas implementações, quando as referências forem geradas, então elas devem ser capturadas com 390 px de largura, com as animações desligadas e com dados fixos, sem data atual nem valores aleatórios', () => {
  for (const f of ESPERADAS) assert.equal(larguraPng(join(telas, f)), 390, `${f} não tem 390 px de largura`)
  const script = readFileSync(join(mock, 'capturar.mjs'), 'utf8')
  assert.match(script, /LARGURA = 390/)
  assert.match(script, /reducedMotion: 'reduce'/)
  assert.match(script, /animation: none !important/)
  assert.match(script, /clock\.install\(\{ time: DATA_FIXA \}\)/, 'o relógio precisa ser fixo')
  assert.match(script, /Math\.random = /, 'o sorteio precisa ter semente')
})

test('Dado que a mesma entrada deve dar o mesmo resultado, quando o comando for rodado duas vezes sem mudança no mock, então as imagens geradas devem ser idênticas', async (t) => {
  if (!(await temNavegador())) return t.skip('o Chromium do Playwright não está instalado; rode npx playwright install chromium')
  const base = mkdtempSync(join(tmpdir(), 'telas-'))
  try {
    const rodar = (nome) => {
      const dir = join(base, nome)
      execFileSync('node', [join(mock, 'capturar.mjs')], { cwd: raiz, env: { ...process.env, TELAS_DIR: dir }, stdio: 'pipe' })
      return hashes(dir)
    }
    const primeira = rodar('a')
    const segunda = rodar('b')
    assert.deepEqual(Object.keys(primeira), [...ESPERADAS].sort())
    assert.deepEqual(segunda, primeira)
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

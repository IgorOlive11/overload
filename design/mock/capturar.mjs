// Gera as imagens de referência de cada tela e estado do mock em design/mock/telas.
// Uso: node design/mock/capturar.mjs   (ou npm run mock:telas)
// Roda o build, abre o mock com 390 px de largura, relógio e sorteio fixos e animações desligadas.
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { chromium } from '@playwright/test'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..', '..')
const dist = join(aqui, 'dist')
const destino = process.env.TELAS_DIR || join(aqui, 'telas')

const LARGURA = 390
const ALTURA = 844
// Segunda-feira ao meio-dia: o mock usa a data atual só para o dia da semana do primeiro acesso.
const DATA_FIXA = new Date('2026-01-05T12:00:00')
const SEMENTE = 20260105

const requisitar = createRequire(import.meta.url)
const gsap = join(dirname(requisitar.resolve('gsap/package.json')), 'dist')

// O mock carrega o GSAP de um CDN. Na captura ele vem do pacote npm, na mesma versão, sem rede.
const CDN = [
  [/\/gsap\/3\.12\.5\/gsap\.min\.js/, 'gsap.min.js'],
  [/\/gsap\/3\.12\.5\/ScrollTrigger\.min\.js/, 'ScrollTrigger.min.js'],
]

// Math.random vira um gerador com semente, para o sorteio sair igual em toda rodada.
const SORTEIO_FIXO = `(() => {
  let a = ${SEMENTE};
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
})()`

const SEM_ANIMACAO = `*, *::before, *::after {
  animation: none !important; transition: none !important; caret-color: transparent !important;
  scroll-behavior: auto !important;
}`

const servidos = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/babylon-mini.js': ['babylon-mini.js', 'text/javascript'],
}

execFileSync('node', [join(aqui, 'build.mjs')], { cwd: raiz, stdio: 'inherit' })

// Só os arquivos do build; o caminho pedido nunca vira caminho no disco.
const servidor = http.createServer((req, res) => {
  const servido = servidos[req.url.split('?')[0]]
  if (!servido) return res.writeHead(404).end()
  const [nome, tipo] = servido
  res.writeHead(200, { 'content-type': tipo }).end(readFileSync(join(dist, nome)))
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
const url = `http://127.0.0.1:${servidor.address().port}/`

mkdirSync(destino, { recursive: true })
for (const f of readdirSync(destino)) if (f.endsWith('.png')) rmSync(join(destino, f))

const navegador = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] })

async function abrir() {
  const contexto = await navegador.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  })
  const pagina = await contexto.newPage()
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  await pagina.route(/cdnjs\.cloudflare\.com/, (rota) => {
    const par = CDN.find(([padrao]) => padrao.test(rota.request().url()))
    if (!par) return rota.abort()
    return rota.fulfill({ path: join(gsap, par[1]), contentType: 'text/javascript' })
  })
  await pagina.addInitScript(SORTEIO_FIXO)
  await pagina.clock.install({ time: DATA_FIXA })
  await pagina.goto(url)
  await pagina.addStyleTag({ content: SEM_ANIMACAO })
  await pagina.evaluate(() => document.fonts.ready)
  await assentar(pagina)
  return { contexto, pagina, erros }
}

// Avança o relógio falso, o que dispara os timeouts e os quadros do mock e da cena 3D.
const assentar = (pagina, ms = 1500) => pagina.clock.runFor(ms)

async function foto(pagina, nome) {
  await assentar(pagina, 600)
  await pagina.screenshot({ path: join(destino, `${nome}.png`), animations: 'disabled', caret: 'hide' })
  console.log(`  ${nome}.png`)
}

const aba = (pagina, tela) => pagina.click(`.tabs [data-v="${tela}"]`)
const clicar = async (pagina, seletor) => { await pagina.click(seletor); await assentar(pagina, 1200) }

// Conclui passos da sessão até o cartão atual conter o texto pedido.
async function ate(pagina, texto) {
  for (let i = 0; i < 40; i++) {
    const sub = await pagina.locator('.rcard.act .sub').textContent()
    if (sub.includes(texto)) return
    await pagina.waitForSelector('#actSlot [data-act="done"]', { timeout: 3000 }).catch(async () => {
      throw new Error(`sem botão em "${sub}": ${await pagina.locator('#actSlot').innerHTML()} | ${await pagina.locator('#cardBody').innerHTML()}`)
    })
    await clicar(pagina, '#actSlot [data-act="done"]')
    await pagina.evaluate(() => { const r = document.querySelector('#rGo'); if (r) r.click() })
    await assentar(pagina, 600)
  }
  throw new Error(`não cheguei ao passo "${texto}"`)
}

let total = 0
async function tela(nome, roteiro) {
  const { contexto, pagina, erros } = await abrir()
  try {
    await roteiro(pagina)
    if (erros.length) throw new Error(`erro na página em ${nome}: ${erros.join('; ')}`)
  } finally {
    await contexto.close()
  }
  total++
}

try {
  await tela('primeiro-acesso', async (p) => {
    await clicar(p, '[data-fr="start"]')
    await foto(p, 'primeiro-acesso-cadastro')
    await p.fill('#frName', 'Aluno')
    await p.fill('#frEmail', ['aluno', 'exemplo.test'].join('@')) // fictício, montado em partes para não parecer um e-mail real
    await p.fill('#frPw', 'senha-de-teste-1')
    await p.fill('#frPw2', 'senha-de-teste-1')
    await p.click('#frForm button[type="submit"]')
    await assentar(p, 600)
    await clicar(p, '[data-fr="confirm"]')
    await foto(p, 'primeiro-acesso-boas-vindas')
  })

  await tela('hoje', async (p) => {
    await foto(p, 'hoje-sem-treino-feito')
  })

  await tela('treino', async (p) => {
    await aba(p, 'treino')
    await foto(p, 'treino-antes-de-comecar')
    await clicar(p, '#startBtn2')
    await ate(p, 'Série 1')
    await foto(p, 'treino-serie')
    await clicar(p, '#cardBody [data-act="gerpick"]')
    await foto(p, 'treino-esforco')
    await clicar(p, '#shBody [data-pickg]')
    await clicar(p, '#actSlot [data-act="done"]')
    await p.waitForSelector('#rPanel')
    await foto(p, 'treino-descanso')
    await clicar(p, '#endEarly')
    await clicar(p, '#endEarly')
    await foto(p, 'treino-fim-da-sessao')
    await clicar(p, '#backHome')
    await foto(p, 'hoje-com-treino-feito')
  })

  await tela('progresso', async (p) => {
    await aba(p, 'progresso')
    await foto(p, 'progresso')
  })

  await tela('plano', async (p) => {
    await aba(p, 'plano')
    await foto(p, 'plano-fase-atual')
    await clicar(p, '[data-pv="build"]')
    await foto(p, 'plano-montador')
    await clicar(p, '[data-s="imp"]')
    await foto(p, 'plano-importacao-csv')
  })
} finally {
  await navegador.close()
  servidor.close()
}
console.log(`Imagens geradas em ${destino}`)

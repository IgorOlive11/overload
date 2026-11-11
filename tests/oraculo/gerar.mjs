// Gera os casos do oráculo de progressão e carga rodando as regras do próprio mock (design/mock/regras.js).
// O mock é a referência: src/domain precisa devolver o mesmo para as mesmas entradas. Os casos são gerados na hora,
// a cada teste, então nunca ficam atrás do mock. Para ver quantos são: node tests/oraculo/gerar.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const aqui = dirname(fileURLToPath(import.meta.url))
const mock = join(aqui, '..', '..', 'design', 'mock')
const ler = (nome) => readFileSync(join(mock, `${nome}.js`), 'utf8')

/* O que hoje.js define para a volta depois de pausa, com os dias parados ajustáveis pelo gerador. */
const cola = `
const GAP = {ok:0};
let scenario = 'ok';
const backKg = (en, eq) => { const L = lastOf(en), g = GAP[scenario]; return g >= 28 ? roundEq(L.kg * .9, eq) : L.kg; };
function diasParados(d){ GAP.ok = d; }
`
const stub = { matchMedia: () => ({ matches: false }) }
const ctx = vm.createContext({ window: stub, document: { querySelectorAll: () => [] } })
vm.runInContext(['doom-face', 'nucleo', 'regras'].map(ler).join('\n') + cola + `
globalThis.R = { planFor, prepInfo, buildSteps, restBefore, estimate, weightQuestion, roundEq, LIB, diasParados };
`, ctx)
const R = ctx.R

export function gerarCasos() {

const EQS = ['barra', 'smith', 'carregada', 'pilha', 'halteres']
const FAIXAS = [[4, 6], [6, 8], [8, 10], [10, 12]]
for (const eq of EQS) R.LIB[`_${eq}`] = { name: eq, m: 'X', acc: [], eq }

/* Conversões entre o formato do mock e o do domínio. */
const serieDom = (s) => s.type === 'NORMAL' ? { tipo: 'NORMAL', ger: s.ger, faixa: s.rr } : { tipo: s.type }
const resDom = (r) => 'reps' in r ? (r.ger == null ? { reps: r.reps } : { reps: r.reps, ger: r.ger }) : 'b1' in r ? { b1: r.b1, b2: r.b2 } : { blocos: r.blocks, ultimo: r.last }
const metaDom = (t) => { const m = { texto: t.txt }; if (t.reps != null) m.reps = t.reps; if (t.b1 != null) m.b1 = t.b1; if (t.last != null) m.ultimo = t.last; if (t.range) m.faixa = true; if (t.effort) m.esforco = true; return m }
const sugDom = (s) => { const o = { kg: s.kg, sobe: s.up, curto: s.short, porque: s.why }; if (s.under) o.abaixo = true; return o }
const plain = (x) => JSON.parse(JSON.stringify(x))

const casos = { cartao: [], pergunta: [], preparo: [], arredondar: [] }
const N = (ger, rr) => ({ type: 'NORMAL', ger, rr })

function cartao(eq, sets, last, dias) {
  R.diasParados(dias)
  const p = plain(R.planFor({ id: `_${eq}`, sets, last }, false))
  const esperado = p.mode === 'wq'
    ? { modo: 'pergunta', kg: p.kg, sugestao: sugDom(p.s), metas: [] }
    : { modo: p.mode, kg: p.kg, sugestao: sugDom(p.s), metas: p.tg.map(metaDom), titulo: p.head, texto: p.body, face: p.face }
  casos.cartao.push({ entrada: { equipamento: eq, series: sets.map(serieDom), ultimo: last ? { kg: last.kg, resultados: last.res.map(resDom) } : null, diasParado: dias }, esperado })
}

/* Séries normais: cada faixa, GER 8 a 11, uma e duas séries, resultados abaixo, dentro, no topo e além do topo,
   com o GER registrado no alvo, acima do alvo ou sem registro; cargas pequenas (salto grande) e grandes. */
const KG = { barra: [20, 40, 100], smith: [20, 50], carregada: [30, 120], pilha: [20, 45], halteres: [8, 18, 30] }
for (const eq of EQS) {
  for (const rr of FAIXAS) {
    for (const ger of [8, 9, 10, 11]) {
      cartao(eq, [N(ger, rr)], null, 0)
      for (const kg of KG[eq]) {
        for (const reps of [rr[0] - 1, rr[0], rr[1] - 1, rr[1], rr[1] + 1]) {
          for (const g of [ger, ger + 1, null]) {
            if (g != null && g > 13) continue
            const r = g == null ? { reps } : { reps, ger: g }
            cartao(eq, [N(ger, rr)], { kg, res: [r] }, 0)
            cartao(eq, [N(ger, rr), N(ger, rr)], { kg, res: [r, { reps: rr[1], ger }] }, 0)
          }
        }
      }
    }
  }
}
/* Rest-pause, muscle round e combinações com série normal. */
for (const eq of EQS) {
  const kg = KG[eq][1]
  cartao(eq, [{ type: 'REST_PAUSE' }], null, 0)
  for (const b1 of [6, 9, 10, 12]) cartao(eq, [{ type: 'REST_PAUSE' }], { kg, res: [{ b1, b2: 4 }] }, 0)
  for (const [blocks, last] of [[2, 3], [5, 2], [6, 4], [6, 5], [6, 8]]) cartao(eq, [{ type: 'MUSCLE_ROUND' }], { kg, res: [{ blocks, last }] }, 0)
  for (const [reps, b1] of [[8, 9], [8, 10], [6, 11], [5, 7]]) cartao(eq, [N(9, [6, 8]), { type: 'REST_PAUSE' }], { kg, res: [{ reps, ger: 9 }, { b1, b2: 4 }] }, 0)
}
/* Volta depois de pausa: 14, 15, 27, 28 e 40 dias, com e sem progressão na última vez. */
for (const eq of EQS) {
  const kg = KG[eq].at(-1)
  for (const dias of [3, 14, 15, 27, 28, 40]) {
    cartao(eq, [N(9, [8, 10]), N(9, [8, 10])], { kg, res: [{ reps: 10, ger: 9 }, { reps: 10, ger: 9 }] }, dias)
    cartao(eq, [N(9, [8, 10])], { kg, res: [{ reps: 7, ger: 9 }] }, dias)
    cartao(eq, [{ type: 'MUSCLE_ROUND' }], { kg, res: [{ blocks: 6, last: 6 }] }, dias)
  }
}
R.diasParados(0)

for (const ger of [7, 8, 9, 10, 11, 12, 13]) for (const rr of FAIXAS) casos.pergunta.push({ entrada: serieDom(N(ger, rr)), esperado: R.weightQuestion(N(ger, rr)) })
casos.pergunta.push({ entrada: { tipo: 'REST_PAUSE' }, esperado: R.weightQuestion({ type: 'REST_PAUSE' }) })
casos.pergunta.push({ entrada: { tipo: 'MUSCLE_ROUND' }, esperado: R.weightQuestion({ type: 'MUSCLE_ROUND' }) })

for (const eq of EQS) for (const kg of [0, 1, 2.4, 13, 17.4, 21.3, 22.6, 37.5, 41, 99.9, 112.3]) casos.arredondar.push({ entrada: { kg, equipamento: eq }, esperado: R.roundEq(kg, eq) })

/* Preparo, passos, descansos e estimativa: listas com músculos que repetem como principal e como acessório, e travas manuais. */
const ex = (m, acc, eq, sets, prep, rest, prepRest) => ({ m, acc, eq, sets, prep, rest, prepRest })
const LISTAS = [
  [ex('OMBROS', ['PEITO'], 'smith', [N(9, [6, 8]), { type: 'REST_PAUSE' }], 'auto', 120, 40), ex('PEITO', [], 'pilha', [N(9, [10, 12])], 'auto', 90, 40), ex('PEITO', ['TRÍCEPS'], 'halteres', [N(9, [10, 12]), N(9, [10, 12])], 'auto', 120, 40), ex('OMBROS', [], 'pilha', [{ type: 'MUSCLE_ROUND' }], 'auto', 90, 40), ex('TRÍCEPS', [], 'pilha', [N(10, [10, 12])], 0, 90, 40), ex('QUADRÍCEPS', ['GLÚTEOS'], 'carregada', [N(8, [10, 12]), N(8, [10, 12])], 'auto', 120, 40), ex('PANTURRILHA', [], 'pilha', [N(9, [10, 12])], 1, 60, 30), ex('POSTERIOR', ['GLÚTEOS'], 'barra', [N(9, [8, 10]), N(9, [8, 10])], 'auto', 120, 40)],
  [ex('COSTAS', ['BÍCEPS'], 'pilha', [N(8, [8, 12]), N(8, [8, 12])], 2, 120, 60), ex('BÍCEPS', [], 'pilha', [N(10, [10, 12])], 'auto', 90, 30), ex('COSTAS', [], 'carregada', [N(9, [8, 10])], 'auto', 120, 40), ex('GLÚTEOS', [], 'barra', [N(9, [6, 8])], 3, 150, 60)]
]
for (const lista of LISTAS) {
  const mock = lista.map((e, i) => { R.LIB[`_l${i}`] = { name: `l${i}`, m: e.m, acc: e.acc, eq: e.eq }; return { id: `_l${i}`, sets: e.sets, prep: e.prep, rest: e.rest, prepRest: e.prepRest } })
  const dom = lista.map((e) => ({ musculo: e.m, acessorios: e.acc, equipamento: e.eq, series: e.sets.map(serieDom), preparo: e.prep, descanso: e.rest, descansoPreparo: e.prepRest }))
  const st = plain(R.buildSteps(mock))
  casos.preparo.push({
    entrada: dom,
    esperado: {
      preparos: mock.map((_, k) => { const p = plain(R.prepInfo(mock, k)); return { n: p.n, estado: p.state, automatico: p.auto, travado: p.locked, porque: p.why } }),
      passos: st.map((x) => x.kind === 'CALIB' ? { k: x.k, tipo: 'CALIBRACAO' } : x.kind === 'PREP' ? { k: x.k, tipo: 'PREPARO', j: x.j, n: x.n, fracao: x.pct, faixa: x.rr } : { k: x.k, tipo: 'TRABALHO', j: x.j, serie: serieDom(x.set) }),
      descansos: st.map((x, i) => R.restBefore(x, st[i + 1], mock)),
      estimativaMin: R.estimate(mock)
    }
  })
}

return casos
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const c = gerarCasos()
  console.log(`cartão ${c.cartao.length}, pergunta ${c.pergunta.length}, arredondar ${c.arredondar.length}, preparo ${c.preparo.length}`)
}

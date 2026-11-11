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
/* Só as partes puras de csv.js (até os botões) e a função frToday de primeiro-acesso.js. */
const csvPuro = ler("csv").split("$('bExport')")[0]
const frToday = ler("primeiro-acesso").match(/function frToday\(\)\{[\s\S]*?\n\}/)[0]
const colaAgenda = `
const norm = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
let draft = {schedule:'semana'};
const FRT = {day:0, dow0:0, lastDay:null, sessions:[], next:0};
const dowOf = d => (FRT.dow0 + d) % 7;
function agenda(modo, dias, hoje, feitoHoje, prox){ draft.schedule = modo; FRT.day = 0; FRT.dow0 = hoje; FRT.lastDay = feitoHoje ? 0 : null; FRT.next = prox; FRT.sessions = dias.map(d => ({day:d})); return frToday(); }
`
const ctx = vm.createContext({ window: stub, document: { querySelectorAll: () => [] } })
vm.runInContext(['doom-face', 'nucleo', 'regras'].map(ler).join('\n') + cola + colaAgenda + csvPuro + '\n' + frToday + `
globalThis.R = { toCsv, parseCsv, agenda,planFor, prepInfo, buildSteps, restBefore, estimate, weightQuestion, roundEq, LIB, diasParados };
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

/* Agenda: os dois modos, protocolos de 1 a 5 dias, cada dia da semana como hoje, com e sem o treino de hoje feito. */
casos.agenda = []
const PROTOS = [[], [2], [0, 3], [0, 2, 4], [1, 3, 5], [0, 1, 3, 4], [0, 1, 2, 3, 4], [5, 6]]
for (const modo of ['semana', 'sequencia']) {
  for (const dias of PROTOS) {
    for (let hoje = 0; hoje < 7; hoje++) {
      for (const feitoHoje of [false, true]) {
        for (const prox of modo === 'sequencia' ? dias.map((_, i) => i) : [0]) {
          const t = plain(R.agenda(modo, dias, hoje, feitoHoje, prox))
          casos.agenda.push({
            entrada: { modo, dias, hoje, feitoHoje, proximoDaFila: prox },
            esperado: t ? { indice: t.idx, hoje: t.today, emDias: t.at, feitoHoje: t.doneToday } : null
          })
        }
      }
    }
  }
}

/* CSV: a biblioteca do mock, protocolos exportados e arquivos importados, inclusive os da v1. */
casos.biblioteca = Object.fromEntries(Object.entries(R.LIB).filter(([k]) => !k.startsWith('_')).map(([k, L]) => [k, { nome: L.name, musculo: L.m, acessorios: L.acc, equipamento: L.eq }]))
const serieMock = (s) => s.tipo === 'NORMAL' ? { type: 'NORMAL', ger: s.ger, rr: s.faixa } : { type: s.tipo }
const protoDom = (d) => ({
  agenda: d.schedule, descanso: d.rest, descansoPreparo: d.prepRest,
  camada: { fase: d.layer.phase, semanas: d.layer.weeks, meta: d.layer.goal, metaN: d.layer.goalN, nuncaDuas: d.layer.never2 },
  dias: d.days.map((x) => ({ folga: x.off, exercicios: x.ex.map((e) => { const o = { id: e.id, series: e.sets.map(serieDom), preparo: e.prep, descanso: e.rest ?? null, descansoPreparo: e.prepRest ?? null }; if (e.acc) o.acessorios = e.acc; return o }) }))
})
const protoMock = (p) => ({
  schedule: p.agenda, rest: p.descanso, prepRest: p.descansoPreparo,
  layer: { phase: p.camada.fase, weeks: p.camada.semanas, goal: p.camada.meta, goalN: p.camada.metaN, never2: p.camada.nuncaDuas },
  days: p.dias.map((x) => ({ off: x.folga, ex: x.exercicios.map((e) => ({ id: e.id, sets: e.series.map(serieMock), prep: e.preparo, acc: e.acessorios, rest: e.descanso, prepRest: e.descansoPreparo })) }))
})
const ids = Object.keys(casos.biblioteca)
const nDom = (ger, faixa) => ({ tipo: 'NORMAL', ger, faixa })
const exDom = (i, series, extra = {}) => ({ id: ids[i % ids.length], series, preparo: 'auto', descanso: null, descansoPreparo: null, ...extra })
const camada = { fase: true, semanas: 6, meta: true, metaN: 3, nuncaDuas: true }
const vazio = () => ({ folga: true, exercicios: [] })
const PROTOCOLOS = [
  { agenda: 'semana', descanso: 120, descansoPreparo: 40, camada, dias: [
    { folga: false, exercicios: [exDom(0, [nDom(9, [6, 8]), nDom(8, [6, 8])]), exDom(1, [nDom(10, [10, 12])], { preparo: 0, descanso: 90 })] },
    vazio(), { folga: false, exercicios: [exDom(4, [{ tipo: 'REST_PAUSE' }]), exDom(5, [{ tipo: 'MUSCLE_ROUND' }], { acessorios: ['GLÚTEOS', 'CORE'], descansoPreparo: 60 })] },
    vazio(), { folga: false, exercicios: [] }, vazio(), vazio()] },
  { agenda: 'sequencia', descanso: 90, descansoPreparo: 30, camada: { ...camada, semanas: 8, metaN: 4 }, dias: Array.from({ length: 7 }, (_, d) =>
    d % 2 ? vazio() : { folga: false, exercicios: [exDom(d, [nDom(9, [8, 10]), nDom(9, [8, 10])], { preparo: (d % 4), descanso: 150 }), exDom(d + 3, [nDom(11, [10, 12])])] }) }
]
casos.exportar = PROTOCOLOS.map((p) => ({ entrada: p, esperado: R.toCsv(protoMock(p)) }))
const cab = 'semana,dia,descanso_seg,prep_seg,dia_descanso,exercicio,musculo,tipo_serie,ger,rep_range,musculo_acessorio,prep_override,biblioteca_id,apelido_pt'
const nome = (i) => casos.biblioteca[ids[i]].nome
const ARQUIVOS = [
  ...casos.exportar.map((c) => c.esperado),
  '',
  cab,
  'semana,exercicio\n1,Supino',
  /* Arquivo da v1: várias semanas, tipos que saíram, GER e faixa inválidos, nome sem vínculo, apelido e ponto e vírgula. */
  `﻿${cab}\n1,1,90,30,N,${nome(0)},X,NORMAL,9,8-10,,,${ids[0]},\n1,1,90,30,N,${nome(0)},X,DROP_SET,10,8-12,,,,\n1,1,90,30,N,Exercício inventado,X,NORMAL,9,8-10,,,,\n1,2,,,S,,,,,,,,,\n1,3,120,40,N,qualquer,X,NORMAL,15,abc,"OMBROS|peito| nada",7,,${nome(2).toUpperCase()}\n1,3,120,40,N,qualquer,X,BACK_OFF,9,10-12,,,,${nome(2)}\n2,1,90,30,N,${nome(1)},X,NORMAL,9,8-10,,,,\n3,4,90,30,N,${nome(1)},X,NORMAL,9,8-10,,,,`,
  `${cab.replace(/,/g, ';')}\n1;5;60;60;N;${nome(3)};X;REST_PAUSE;;;;;;\n1;5;60;60;N;${nome(3)};X;MUSCLE_ROUND;;;;;;\n1;6;60;60;N;${nome(4)};X;NORMAL;8;4-6;;2;;\n1;9;60;60;N;${nome(4)};X;NORMAL;8;4-6;;;;`,
  `${cab},agenda,fase_semanas\n1,1,120,40,N,${nome(6)},X,NORMAL,9,6-8,,,,,sequencia,5\n1,1,120,40,N,${nome(7)},X,NORMAL,9,6-8,,,,,,`,
  `${cab},agenda,fase_semanas\n1,2,120,40,N,"${nome(8)}",X,NORMAL,9,6-8,,,,,semana,12\n1,7,180,40,N,${nome(8)},X,NORMAL,9,"6-8",,,,,,3`
]
casos.importar = ARQUIVOS.map((texto) => {
  try {
    const r = plain(R.parseCsv(texto))
    return { entrada: texto, esperado: { ok: true, rascunho: protoDom(r.draft), resumo: r.ok, avisos: r.warn } }
  } catch (erro) {
    return { entrada: texto, esperado: { ok: false, erro: erro.message } }
  }
})

return casos
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const c = gerarCasos()
  console.log(`cartão ${c.cartao.length}, pergunta ${c.pergunta.length}, arredondar ${c.arredondar.length}, preparo ${c.preparo.length}, agenda ${c.agenda.length}, exportar ${c.exportar.length}, importar ${c.importar.length}`)
}

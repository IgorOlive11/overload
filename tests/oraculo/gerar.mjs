// Gera os casos do oráculo de progressão e carga executando as funções reais do mock.
// Uso: node tests/oraculo/gerar.mjs   (ou npm run oraculo:gerar)
import vm from 'node:vm'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const mock = join(aqui, '..', '..', 'design', 'mock')
export const pastaCasos = join(aqui, 'casos')

// As partes do mock formam um único script. Aqui entram só as que definem as regras, na ordem do build.mjs.
const PARTES = ['doom-face', 'nucleo', 'regras', 'hoje', 'sessao']
const ORIGEM = {
  'regras.js': 'design/mock/regras.js',
  'sessao.js': 'design/mock/sessao.js',
  'hoje.js': 'design/mock/hoje.js',
}

// Objeto que aceita qualquer acesso: o DOM não faz parte das regras, mas o script o toca ao carregar.
const vazio = () =>
  new Proxy(function () {}, {
    get: (_, k) => (k === Symbol.toPrimitive ? () => '' : k === 'matches' ? false : vazio()),
    apply: () => vazio(),
    construct: () => vazio(),
    set: () => true,
  })

function carregarMock() {
  const ctx = {
    document: vazio(), window: vazio(), localStorage: vazio(), navigator: vazio(), ScrollTrigger: vazio(),
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    requestAnimationFrame: () => 0, matchMedia: () => ({ matches: false }),
  }
  vm.createContext(ctx)
  for (const parte of PARTES) {
    vm.runInContext(readFileSync(join(mock, `${parte}.js`), 'utf8'), ctx, { filename: `${parte}.js` })
  }
  // Roda uma expressão no contexto do mock e devolve o resultado como JSON puro.
  return (expr) => {
    const json = vm.runInContext(`JSON.stringify(${expr})`, ctx)
    return json === undefined ? null : JSON.parse(json)
  }
}

const N = (ger, rr = [8, 12]) => ({ type: 'NORMAL', ger, rr })
const T = (type) => ({ type })
const RP = T('REST_PAUSE')
const MR = T('MUSCLE_ROUND')
const ex = (id, sets, extra = {}) => ({ id, sets, ...extra })
const lista = (...itens) => itens.map(([id, sets, extra]) => ex(id, sets, { prep: 'auto', rest: 120, prepRest: 60, ...extra }))
const res = (kg, ...rs) => ({ kg, res: rs })
const j = (v) => JSON.stringify(v)

export function gerar() {
  const roda = carregarMock()
  const grupos = { carga: [], progressao: [], preparo: [] }
  const contagem = {}

  // Cada caso guarda a função de origem, a entrada e a saída que o próprio mock produz.
  function caso(grupo, funcao, arquivo, tipo, descricao, entrada, expr) {
    contagem[funcao] = (contagem[funcao] || 0) + 1
    grupos[grupo].push({
      id: `${funcao}-${String(contagem[funcao]).padStart(2, '0')}`,
      funcao, origem: ORIGEM[arquivo], tipo, descricao, entrada, saida: roda(expr),
    })
  }
  const c = (f, tipo, d, e, x) => caso('carga', f, 'regras.js', tipo, d, e, x)
  const p = (f, tipo, d, e, x) => caso('progressao', f, 'regras.js', tipo, d, e, x)
  const q = (f, tipo, d, e, x) => caso('preparo', f, 'regras.js', tipo, d, e, x)
  const s = (f, tipo, d, e, x) => caso('preparo', f, 'sessao.js', tipo, d, e, x)

  /* ---------- carga ---------- */
  const EQS = ['barra', 'smith', 'carregada', 'pilha', 'halteres']
  for (const eq of EQS) {
    c('roundEq', 'comum', `42 kg em ${eq}`, { kg: 42, eq }, `roundEq(42, ${j(eq)})`)
    c('roundEq', 'comum', `57,3 kg em ${eq}`, { kg: 57.3, eq }, `roundEq(57.3, ${j(eq)})`)
  }
  for (const [eq, base, step] of [['barra', 20, 2.5], ['smith', 15, 2.5], ['carregada', 0, 5], ['pilha', 0, 2.5], ['halteres', 0, 2]]) {
    c('roundEq', 'borda', `carga zero em ${eq}: nunca abaixo da base ou do passo`, { kg: 0, eq }, `roundEq(0, ${j(eq)})`)
    c('roundEq', 'borda', `carga 1 kg abaixo da base de ${eq}: não fica abaixo da base`, { kg: base - 1, eq }, `roundEq(${base - 1}, ${j(eq)})`)
    const meio = base + step / 2
    c('roundEq', 'borda', `meio passo exato em ${eq}: arredonda para cima`, { kg: meio, eq }, `roundEq(${meio}, ${j(eq)})`)
    c('roundEq', 'borda', `logo abaixo do meio passo em ${eq}: arredonda para baixo`, { kg: meio - 0.01, eq }, `roundEq(${meio - 0.01}, ${j(eq)})`)
  }

  for (const eq of EQS) {
    c('unitOf', eq === 'halteres' ? 'borda' : 'comum', eq === 'halteres' ? 'halteres: carga por mão' : `unidade de ${eq}`, { eq }, `unitOf(${j(eq)})`)
  }

  const prep = (tipo, d, id, kg, pct) =>
    caso('carga', 'prepKg', 'sessao.js', tipo, d, { exercicio: id, kg_trabalho: kg, pct }, `(S.wk = [{kg:${kg}}], S.list = [{id:${j(id)}}], prepKg(0, ${pct}))`)
  prep('comum', 'barra, 55% de 60 kg', 'stiff', 60, 0.55)
  prep('comum', 'placas, 70% de 50 kg', 'ext', 50, 0.7)
  prep('comum', 'anilhas, 85% de 80 kg', 'hack', 80, 0.85)
  prep('comum', 'Smith, 60% de 40 kg', 'dev', 40, 0.6)
  prep('comum', 'halteres, 80% de 20 kg', 'supH', 20, 0.8)
  prep('borda', 'barra: o preparo calculado fica abaixo da barra vazia e sobe para 20 kg', 'stiff', 20, 0.55)
  prep('borda', 'halteres: 55% de 10 kg arredonda em 2 kg', 'supH', 10, 0.55)
  prep('borda', 'placas: meio passo exato arredonda para cima', 'ext', 12.5, 0.8)

  const salto = (tipo, d, kg, eq) => c('bigJump', tipo, d, { kg, eq }, `bigJump(${kg}, ${j(eq)})`)
  salto('comum', 'placas com 60 kg: incremento de 4%', 60, 'pilha')
  salto('comum', 'placas com 10 kg: incremento de 25%', 10, 'pilha')
  salto('borda', 'incremento exatamente em 10% (placas, 25 kg): não é salto grande', 25, 'pilha')
  salto('borda', 'logo acima de 10% (placas, 24 kg): é salto grande', 24, 'pilha')
  salto('borda', 'incremento exatamente em 10% (barra, 50 kg)', 50, 'barra')
  salto('borda', 'logo acima de 10% (barra, 49 kg)', 49, 'barra')
  salto('borda', 'incremento exatamente em 10% (halteres, 20 kg)', 20, 'halteres')
  salto('borda', 'carga zero nunca é salto grande', 0, 'barra')

  const volta = (tipo, d, en, eq, dias) => {
    caso('carga', 'backKg', 'hoje.js', tipo, d, { exercicio: en, equipamento: eq, dias_sem_treinar: dias },
      `(GAP.oraculo = ${dias}, scenario = 'oraculo', backKg(${j(en)}, ${j(eq)}))`)
  }
  const hack = ex('hack', [N(8), N(8)])
  const dev = ex('dev', [N(9, [6, 8])], { last: res(40, { reps: 8, ger: 9 }) })
  volta('comum', 'sem tempo fora: a carga continua a mesma', hack, 'carregada', 0)
  volta('comum', '15 dias fora na máquina de anilhas', hack, 'carregada', 15)
  volta('comum', '30 dias fora: carga 10% mais leve (anilhas)', hack, 'carregada', 30)
  volta('borda', '14 dias: ainda abaixo do limite de 15', hack, 'carregada', 14)
  volta('borda', '27 dias: ainda abaixo do limite de 28, a carga se mantém', hack, 'carregada', 27)
  volta('borda', '28 dias: a carga cai 10%', hack, 'carregada', 28)
  volta('borda', '28 dias no Smith: 10% menos, arredondado em 2,5 kg sobre a base de 15 kg', dev, 'smith', 28)

  /* ---------- progressão ---------- */
  const jg = (tipo, d, set, r, kg, eq) =>
    p('judge', tipo, d, { serie: set, resultado: r, kg, eq }, `judge(${j(set)}, ${j(r)}, ${kg}, ${j(eq)})`)
  const n88 = N(8)
  jg('comum', 'normal: topo da faixa com a reserva combinada', n88, { reps: 12, ger: 8 }, 40, 'pilha')
  jg('comum', 'normal: meio da faixa', n88, { reps: 10, ger: 8 }, 40, 'pilha')
  jg('comum', 'normal: topo, mas com menos reserva que o combinado', n88, { reps: 12, ger: 9 }, 40, 'pilha')
  jg('comum', 'normal: topo com mais reserva que o combinado', n88, { reps: 12, ger: 7 }, 40, 'pilha')
  jg('comum', 'normal: sem GER no resultado vale o GER da série', n88, { reps: 12 }, 40, 'pilha')
  jg('borda', 'normal: uma repetição abaixo do topo', n88, { reps: 11, ger: 8 }, 40, 'pilha')
  jg('borda', 'normal: exatamente o mínimo da faixa não é abaixo da faixa', n88, { reps: 8, ger: 8 }, 40, 'pilha')
  jg('borda', 'normal: uma repetição abaixo do mínimo é abaixo da faixa', n88, { reps: 7, ger: 8 }, 40, 'pilha')
  jg('borda', 'salto grande: repetições = topo não basta', n88, { reps: 12, ger: 8 }, 20, 'pilha')
  jg('borda', 'salto grande: repetições = topo + 1 sobe', n88, { reps: 13, ger: 8 }, 20, 'pilha')
  jg('borda', 'sem salto grande (exatamente 10%): o topo basta', n88, { reps: 12, ger: 8 }, 25, 'pilha')
  jg('borda', 'série não feita', n88, null, 40, 'pilha')
  jg('comum', 'rest-pause: bloco 1 com 10 repetições sobe', RP, { b1: 10, b2: 4 }, 40, 'pilha')
  jg('borda', 'rest-pause: bloco 1 com 9 repetições não sobe', RP, { b1: 9, b2: 5 }, 40, 'pilha')
  jg('comum', 'muscle round completo com 6 repetições no sexto bloco', MR, { blocks: 6, last: 6 }, 20, 'pilha')
  jg('borda', 'muscle round: sexto bloco com 5 repetições sobe', MR, { blocks: 6, last: 5 }, 20, 'pilha')
  jg('borda', 'muscle round: sexto bloco com 4 repetições não sobe', MR, { blocks: 6, last: 4 }, 20, 'pilha')
  jg('borda', 'muscle round: falha no bloco 5 não sobe', MR, { blocks: 5, last: 4 }, 20, 'pilha')

  const sug = (tipo, d, en) => p('suggestion', tipo, d, { exercicio: en }, `suggestion(${j(en)})`)
  sug('comum', 'sobe quando todas as séries batem a regra', ex('hack', [N(8), N(8)], { last: res(80, { reps: 12, ger: 8 }, { reps: 12, ger: 8 }) }))
  sug('comum', 'mantém quando uma série não bate', ex('hack', [N(8), N(8)], { last: res(80, { reps: 12, ger: 8 }, { reps: 10, ger: 8 }) }))
  sug('comum', 'usa o histórico de exemplo do mock (hack, 12 e 12 com 80 kg)', ex('hack', [N(8), N(8)]))
  sug('comum', 'sobe com rest-pause e muscle round nos limites da regra', ex('dev', [RP, MR], { last: res(40, { b1: 10, b2: 3 }, { blocks: 6, last: 5 }) }))
  sug('borda', 'sem histórico: primeira vez', ex('pecfly', [N(9, [10, 12])]))
  sug('borda', 'abaixo da faixa em uma série: mantém e avisa', ex('hack', [N(8), N(8)], { last: res(80, { reps: 12, ger: 8 }, { reps: 7, ger: 8 }) }))
  sug('borda', 'salto grande no topo: mantém', ex('pul', [N(9, [10, 12])], { last: res(15, { reps: 12, ger: 9 }) }))
  sug('borda', 'salto grande uma repetição acima do topo: sobe', ex('pul', [N(9, [10, 12])], { last: res(15, { reps: 13, ger: 9 }) }))
  sug('borda', 'número de séries diferente do histórico de exemplo: sem histórico', ex('hack', [N(8), N(8), N(8)]))

  const alvo = (tipo, d, set, r, up, big) =>
    p('targetOf', tipo, d, { serie: set, resultado: r, subiu: up, salto_grande: big }, `targetOf(${j(set)}, ${j(r)}, ${up}, ${big})`)
  alvo('comum', 'normal que subiu: faixa inteira', n88, { reps: 12, ger: 8 }, true, false)
  alvo('comum', 'normal no topo sem subir: repete o topo', n88, { reps: 12, ger: 9 }, false, false)
  alvo('comum', 'normal no meio da faixa: uma repetição a mais', n88, { reps: 10, ger: 8 }, false, false)
  alvo('borda', 'normal abaixo do mínimo: a meta sobe para o mínimo da faixa', n88, { reps: 5, ger: 8 }, false, false)
  alvo('borda', 'normal exatamente no mínimo: mínimo + 1', n88, { reps: 8, ger: 8 }, false, false)
  alvo('borda', 'salto grande no topo: uma repetição além do topo', n88, { reps: 12, ger: 8 }, false, true)
  alvo('borda', 'salto grande abaixo do topo: segue a regra comum', n88, { reps: 11, ger: 8 }, false, true)
  alvo('comum', 'rest-pause que subiu: cerca de 8 repetições', RP, { b1: 10, b2: 4 }, true, false)
  alvo('comum', 'rest-pause sem subir: bloco 1 mais uma', RP, { b1: 7, b2: 3 }, false, false)
  alvo('borda', 'rest-pause com 9 no bloco 1: a meta é 10, o teto', RP, { b1: 9, b2: 3 }, false, false)
  alvo('borda', 'rest-pause com 10 no bloco 1 sem subir: a meta não passa de 10', RP, { b1: 10, b2: 3 }, false, false)
  alvo('comum', 'muscle round que subiu: os 6 blocos de 4', MR, { blocks: 6, last: 5 }, true, false)
  alvo('comum', 'muscle round com falha no bloco 3: passar do bloco 4', MR, { blocks: 3, last: 4 }, false, false)
  alvo('borda', 'muscle round completo com 4 no sexto: a meta é 5 repetições', MR, { blocks: 6, last: 4 }, false, false)
  alvo('borda', 'muscle round completo com 6 no sexto sem subir: 7 repetições', MR, { blocks: 6, last: 6 }, false, false)

  const plano = (tipo, d, en, dias, demo = false) =>
    p('planFor', tipo, d, { exercicio: en, dias_sem_treinar: dias, demo },
      `(GAP.oraculo = ${dias}, scenario = 'oraculo', planFor(${j(en)}, ${demo}))`)
  const topo = ex('hack', [N(8), N(8)], { last: res(80, { reps: 12, ger: 8 }, { reps: 12, ger: 8 }) })
  const meio = ex('hack', [N(8), N(8)], { last: res(80, { reps: 12, ger: 8 }, { reps: 10, ger: 8 }) })
  const baixo = ex('hack', [N(8), N(8)], { last: res(80, { reps: 12, ger: 8 }, { reps: 6, ger: 8 }) })
  plano('comum', 'modo up: todas as séries bateram a regra', topo, 0)
  plano('comum', 'modo hold: uma série ficou abaixo do topo', meio, 0)
  plano('comum', 'modo under: uma série abaixo do mínimo da faixa', baixo, 0)
  plano('comum', 'rest-pause e muscle round que subiram', ex('dev', [RP, MR], { last: res(40, { b1: 10, b2: 3 }, { blocks: 6, last: 5 }) }), 3)
  plano('borda', 'modo wq: primeira vez, usa a carga padrão do equipamento', ex('pecfly', [N(9, [10, 12])]), 0)
  plano('borda', 'modo wq na demonstração', ex('pecfly', [N(9, [10, 12])]), 30, true)
  plano('borda', 'demonstração ignora os dias sem treinar', topo, 30, true)
  plano('borda', '14 dias sem treinar: ainda não é volta', topo, 14)
  plano('borda', '15 dias sem treinar: modo back, mesma carga, meta no começo da faixa', topo, 15)
  plano('borda', '27 dias sem treinar: modo back sem corte de carga', topo, 27)
  plano('borda', '28 dias sem treinar: modo back com a carga 10% menor', topo, 28)
  plano('borda', '30 dias sem treinar com rest-pause: a meta de rest-pause segue a regra comum', ex('dev', [RP], { last: res(40, { b1: 8, b2: 3 }) }), 30)
  plano('borda', 'salto grande no topo: meta de uma repetição além do topo', ex('pul', [N(9, [10, 12])], { last: res(15, { reps: 12, ger: 9 }) }), 0)

  const ultimo = (tipo, d, en) => p('lastOf', tipo, d, { exercicio: en }, `lastOf(${j(en)})`)
  ultimo('comum', 'histórico dado na própria entrada', ex('hack', [N(8)], { last: res(50, { reps: 10, ger: 8 }) }))
  ultimo('comum', 'mesmo número de séries normais: reaproveita o histórico do exercício', ex('hack', [N(8), N(8)]))
  ultimo('borda', 'número de séries diferente: sem histórico', ex('hack', [N(8)]))
  ultimo('borda', 'exercício sem histórico', ex('pecfly', [N(9, [10, 12])]))
  ultimo('borda', 'série que não é normal sem histórico dado: sem histórico no mock', ex('hack', [N(8), RP]))

  /* O mock só reaproveita o histórico quando todas as séries são normais. Pela resposta 1 do PO na 0005, vale a mesma lista
     de tipos de série, entre protocolos. Estes casos seguem a regra; `saida_do_mock` mostra o que o mock faz hoje. */
  const regra = (descricao, en, historico, saida) => {
    contagem.lastOf = (contagem.lastOf || 0) + 1
    grupos.progressao.push({
      id: `lastOf-${String(contagem.lastOf).padStart(2, '0')}`,
      funcao: 'lastOf', origem: ORIGEM['regras.js'], tipo: 'borda', descricao,
      entrada: { exercicio: en, historico }, saida,
      divergencia_do_mock: true,
      saida_do_mock: roda(`lastOf(${j(en)})`),
      decisao: 'docs/decisoes/0005-cruzamento-das-regras-com-o-mock.md',
      pergunta: 'Pergunta 1: o que é "aquela configuração" de séries',
    })
  }
  const misto = res(40, { reps: 10, ger: 9 }, { b1: 9, b2: 4 })
  regra('mesma lista de tipos (normal e rest-pause) no histórico: reaproveita', ex('dev', [N(9, [6, 8]), RP]),
    { tipos: ['NORMAL', 'REST_PAUSE'], ...misto }, misto)
  regra('mesma lista de tipos em outra faixa de repetições (outro protocolo): reaproveita', ex('stiff', [N(9, [8, 10]), RP]),
    { tipos: ['NORMAL', 'REST_PAUSE'], ...misto }, misto)
  regra('lista de tipos diferente (rest-pause no lugar de normal): sem histórico', ex('dev', [RP, N(9, [6, 8])]),
    { tipos: ['NORMAL', 'REST_PAUSE'], ...misto }, null)

  /* ---------- preparo e pergunta de carga ---------- */
  const info = (tipo, d, l, k) => q('prepInfo', tipo, d, { lista: l, indice: k }, `prepInfo(${j(l)}, ${k})`)
  info('comum', 'estreante: músculo novo na sessão, 3 séries', lista(['dev', [N(8)]]), 0)
  info('comum', 'já primário: o mesmo músculo principal antes, 1 série', lista(['hack', [N(8)]], ['ext', [N(8)]]), 1)
  info('comum', 'pré-ativado: o músculo foi acessório antes, 2 séries', lista(['flex', [N(8)], { acc: ['PEITO'] }], ['sup', [N(8)]]), 1)
  info('borda', 'primário vence acessório quando os dois valem', lista(['hack', [N(8)]], ['sup', [N(8)], { acc: ['QUADRÍCEPS'] }], ['ext', [N(8)]]), 2)
  info('borda', 'trava manual em 0 série de preparo', lista(['dev', [N(8)], { prep: 0 }]), 0)
  info('borda', 'trava manual em 3 com o automático em 1', lista(['hack', [N(8)]], ['ext', [N(8)], { prep: 3 }]), 1)
  info('borda', 'prep indefinido segue o automático', [ex('dev', [N(8)])], 0)

  const passos = (tipo, d, l) => q('buildSteps', tipo, d, { lista: l }, `buildSteps(${j(l)})`)
  passos('comum', 'um exercício estreante com duas séries normais: calibração, 3 preparos e 2 séries', lista(['dev', [N(8), N(8)]]))
  passos('comum', 'dois exercícios do mesmo músculo: o segundo tem 1 preparo', lista(['hack', [N(8)]], ['ext', [N(8)]]))
  passos('comum', 'rest-pause e muscle round como séries válidas', lista(['dev', [RP]], ['elev', [MR]]))
  passos('borda', 'preparo travado em 0: só calibração e séries', lista(['dev', [N(8)], { prep: 0 }]))
  passos('borda', 'lista vazia', [])

  const corte = (tipo, d, l, wk, n) =>
    s('shouldCut', tipo, d, { lista: l, carga_de_trabalho: wk, passo: n },
      `(S.list = ${j(l)}, S.wk = ${j(wk.map((kg) => ({ kg })))}, S.steps = buildSteps(S.list), shouldCut(${n}))`)
  const stf = (rr) => lista(['stiff', [N(8, rr)]])
  corte('comum', 'preparo leve em carga baixa de trabalho: não corta', stf([8, 12]), [60], 2)
  corte('comum', 'carga de preparo menor que a de trabalho: não corta', stf([4, 6]), [60], 2)
  corte('borda', 'o primeiro preparo nunca é cortado', stf([4, 6]), [20], 1)
  corte('borda', 'passo que não é preparo (calibração)', stf([4, 6]), [20], 0)
  corte('borda', 'passo que não é preparo (série de trabalho)', stf([4, 6]), [20], 4)
  corte('borda', 'passo inexistente', stf([4, 6]), [20], 99)
  corte('borda', 'carga do preparo igual à de trabalho e repetições acima do mínimo: corta', stf([4, 6]), [20], 2)
  corte('borda', 'carga do preparo igual à de trabalho, repetições (6) abaixo do mínimo (8): não corta', stf([8, 12]), [20], 2)
  corte('borda', 'repetições do preparo (6) iguais ao mínimo da série (6): corta', stf([6, 10]), [20], 2)
  corte('borda', 'carga do preparo logo abaixo da de trabalho: não corta', stf([4, 6]), [22.5], 2)
  corte('borda', 'primeira série em rest-pause: o mínimo é infinito e nunca corta', lista(['stiff', [RP]]), [20], 2)

  const descanso = (tipo, d, l, i) => {
    const st = roda(`buildSteps(${j(l)})`)
    q('restBefore', tipo, d, { lista: l, atual: st[i], proximo: st[i + 1] ?? null },
      `restBefore(${j(st[i])}, ${j(st[i + 1] ?? null)}, ${j(l)})`)
  }
  const l2 = lista(['hack', [N(8)]], ['ext', [N(8)]]).map((e, k) => ({ ...e, rest: [120, 90][k], prepRest: [60, 40][k] }))
  descanso('comum', 'antes de um preparo vale o descanso de preparo do exercício', l2, 1)
  descanso('comum', 'antes de uma série válida vale o descanso do exercício', l2, 3)
  descanso('comum', 'entre séries do mesmo exercício', lista(['dev', [N(8), N(8)], { prep: 0 }]), 1)
  descanso('borda', 'depois da calibração nunca há descanso', l2, 0)
  descanso('borda', 'na última série não há próximo passo', l2, 7)
  descanso('borda', 'entre exercícios vale o valor do exercício da próxima série', l2, 4)

  const pergunta = (tipo, d, set) => q('weightQuestion', tipo, d, { serie: set }, `weightQuestion(${j(set)})`)
  pergunta('comum', 'normal com 2 a 3 na reserva', N(8))
  pergunta('comum', 'normal com 4 a 6 na reserva', N(7, [10, 12]))
  pergunta('borda', 'normal com 1 na reserva: último nível com reserva', N(9, [6, 8]))
  pergunta('borda', 'normal até a falha com técnica perfeita', N(10))
  pergunta('borda', 'normal além da falha: pergunta pelo topo da faixa', N(11, [6, 8]))
  pergunta('comum', 'rest-pause', RP)
  pergunta('comum', 'muscle round', MR)

  const tabelas = roda('({EQ, INC, DEFKG, RAMPS})')

  const saida = {}
  for (const [grupo, casos] of Object.entries(grupos)) saida[`${grupo}.json`] = casos
  saida['tabelas.json'] = tabelas
  return Object.fromEntries(Object.entries(saida).map(([nome, dados]) => [nome, JSON.stringify(dados, null, 2) + '\n']))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(pastaCasos, { recursive: true })
  const arquivos = gerar()
  for (const [nome, texto] of Object.entries(arquivos)) writeFileSync(join(pastaCasos, nome), texto)
  console.log(`Casos do oráculo gerados em ${pastaCasos}: ${Object.keys(arquivos).join(', ')}`)
}

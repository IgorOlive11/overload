// Critérios de aceite da issue #29 para o oráculo de progressão e carga. Rode com `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gerar, pastaCasos } from './gerar.mjs'

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..')
const ler = (nome) => JSON.parse(readFileSync(join(pastaCasos, nome), 'utf8'))
const casos = ['carga.json', 'progressao.json', 'preparo.json'].flatMap(ler)

const FUNCOES = [
  'roundEq', 'unitOf', 'prepKg', 'bigJump', 'backKg',
  'judge', 'suggestion', 'targetOf', 'planFor', 'lastOf',
  'prepInfo', 'buildSteps', 'shouldCut', 'restBefore', 'weightQuestion',
]

test('Dado que o oráculo deve cobrir as regras do mock, quando a pasta tests/oraculo for inspecionada, então deve haver casos para cada função de progressão e de carga do mock, com a entrada, a saída esperada e o nome da função de origem', () => {
  for (const funcao of FUNCOES) {
    assert.ok(casos.some((c) => c.funcao === funcao), `sem casos para ${funcao}`)
  }
  for (const c of casos) {
    assert.ok(FUNCOES.includes(c.funcao), `${c.id}: função desconhecida ${c.funcao}`)
    assert.ok('entrada' in c && 'saida' in c, `${c.id}: falta entrada ou saída`)
    assert.ok(c.origem?.startsWith('design/mock/'), `${c.id}: falta o arquivo de origem`)
    assert.ok(existsSync(join(raiz, c.origem)), `${c.id}: origem inexistente`)
    const fonte = readFileSync(join(raiz, c.origem), 'utf8')
    assert.match(fonte, new RegExp(`(function ${c.funcao}\\(|const ${c.funcao} =)`), `${c.id}: ${c.funcao} não está em ${c.origem}`)
  }
  assert.equal(new Set(casos.map((c) => c.id)).size, casos.length, 'ids repetidos')
  const tabelas = ler('tabelas.json')
  for (const t of ['EQ', 'INC', 'DEFKG', 'RAMPS']) assert.ok(tabelas[t], `falta a tabela ${t}`)
})

test('Dado que as regras podem ter limites, quando os casos forem lidos, então eles devem incluir os valores de borda de cada regra, além dos casos comuns', () => {
  for (const funcao of FUNCOES) {
    const dela = casos.filter((c) => c.funcao === funcao)
    assert.ok(dela.some((c) => c.tipo === 'borda'), `${funcao} sem caso de borda`)
    if (funcao !== 'lastOf' || dela.some((c) => c.tipo === 'comum')) {
      assert.ok(dela.some((c) => c.tipo === 'comum'), `${funcao} sem caso comum`)
    }
  }
  for (const c of casos) assert.ok(['comum', 'borda'].includes(c.tipo), `${c.id}: tipo inválido`)
})

test('Dado que em conflito vale a regra de negócio, quando a #25 tiver registrado uma divergência entre o mock e a regra, então o caso deve seguir a regra e citar a decisão', () => {
  const divergentes = casos.filter((c) => c.divergencia_do_mock)
  assert.ok(divergentes.length > 0, 'a 0005 registra a divergência do lastOf, que precisa de caso')
  for (const c of divergentes) {
    assert.match(c.decisao, /^docs\/decisoes\/0005-.*\.md$/, `${c.id}: não cita a decisão`)
    assert.ok(existsSync(join(raiz, c.decisao)), `${c.id}: decisão inexistente`)
    assert.ok(c.pergunta, `${c.id}: falta a pergunta da decisão`)
    assert.ok('saida_do_mock' in c, `${c.id}: falta a saída do mock para comparar`)
  }
  // Pelo menos um caso em que a regra e o mock dão respostas diferentes.
  assert.ok(divergentes.some((c) => JSON.stringify(c.saida) !== JSON.stringify(c.saida_do_mock)))
  // Os demais casos são o que o mock produz.
  for (const c of casos.filter((x) => !x.divergencia_do_mock)) assert.ok(!('decisao' in c), `${c.id}: decisão sem divergência`)
})

test('Dado que os casos precisam ser regenerados, quando alguém rodar o comando documentado em tests/oraculo, então os casos devem ser gerados de novo a partir do mock com o mesmo resultado', () => {
  const primeira = gerar()
  const segunda = gerar()
  assert.deepEqual(primeira, segunda, 'duas gerações seguidas diferem')
  for (const [nome, texto] of Object.entries(primeira)) {
    assert.equal(readFileSync(join(pastaCasos, nome), 'utf8'), texto, `${nome} versionado difere do gerado: rode npm run oraculo:gerar`)
  }
  const readme = readFileSync(join(raiz, 'tests', 'oraculo', 'README.md'), 'utf8')
  assert.match(readme, /npm run oraculo:gerar/)
  assert.match(readme, /node tests\/oraculo\/gerar\.mjs/)
})

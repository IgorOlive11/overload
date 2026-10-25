// Critérios de aceite da spike #22. Rode com `npm test`.
// Arquivo descartável: sai da branch antes do merge, para não chegar à master.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..')
const pasta = join(raiz, 'docs', 'decisoes')
const ler = (...caminho) => readFileSync(join(raiz, ...caminho), 'utf8')

const assuntos = { linguagem: 'linguagem-do-v2', aproveitamento: 'aproveitamento-da-v1', diagrama: 'diagrama-do-banco' }
const arquivo = (assunto) => readdirSync(pasta).find((nome) => new RegExp(`^\\d{4}-${assunto}\\.md$`).test(nome))
const registro = (chave) => ler('docs', 'decisoes', arquivo(assuntos[chave]))
const registros = () => Object.keys(assuntos).map(registro)

// Texto entre o título "## <titulo>" e o próximo título de mesmo nível.
const secao = (texto, titulo) => {
  const inicio = texto.indexOf(`\n## ${titulo}\n`)
  if (inicio === -1) return null
  const corpo = texto.slice(inicio + titulo.length + 5)
  const fim = corpo.search(/^## /m)
  return (fim === -1 ? corpo : corpo.slice(0, fim)).trim()
}

test('Dado que cada resposta é usada por issues diferentes, quando a pasta docs/decisoes for inspecionada, então devem existir três registros novos no formato de docs/decisoes/0000-modelo.md, com o próximo número livre: um para a linguagem, um para o aproveitamento da V1 e um para o diagrama do banco', () => {
  const nomes = Object.values(assuntos).map(arquivo)
  for (const [i, nome] of nomes.entries()) assert.ok(nome, `falta o registro ${Object.values(assuntos)[i]}`)
  const numeros = nomes.map((nome) => nome.slice(0, 4))
  assert.equal(new Set(numeros).size, 3, 'os três registros precisam de números diferentes')
  for (const numero of numeros) {
    assert.ok(Number(numero) > 1, `${numero} já é usado pelo modelo ou pela licença`)
    assert.equal(readdirSync(pasta).filter((nome) => nome.startsWith(`${numero}-`)).length, 1, `o número ${numero} está repetido`)
  }
  for (const texto of registros()) {
    assert.match(texto, /^# \S/)
    for (const campo of ['Status', 'Data', 'Quem decidiu']) assert.match(texto, new RegExp(`^- ${campo}: \\S`, 'm'))
    for (const titulo of ['Contexto e problema', 'O que pesou na decisão', 'Opções consideradas', 'Decisão', 'Consequências', 'Como conferir']) {
      assert.ok(secao(texto, titulo), `falta a seção ${titulo}`)
    }
  }
})

test('Dado que uma decisão só vale com as alternativas, quando cada registro for lido, então ele deve trazer pelo menos duas opções avaliadas, o que pesou na escolha, a recomendação e as consequências', () => {
  for (const texto of registros()) {
    assert.ok(secao(texto, 'Opções consideradas').match(/^\d+\. \S/gm).length >= 2, 'menos de duas opções')
    assert.match(secao(texto, 'O que pesou na decisão'), /^- \S/m)
    assert.match(secao(texto, 'Decisão'), /recomend/i)
    assert.match(secao(texto, 'Consequências'), /^- \S/m)
  }
})

test('Dado que a escolha da linguagem depende do custo, quando o registro de linguagem for lido, então ele deve dizer o que muda em package.json, no lint, no build, nos testes e no AGENTS.md se a recomendação for adotada', () => {
  const consequencias = secao(registro('linguagem'), 'Consequências')
  for (const item of ['`package.json`', 'lint', 'build', 'testes', '`AGENTS.md`']) {
    assert.ok(consequencias.toLowerCase().includes(item.toLowerCase()), `as consequências não citam ${item}`)
  }
})

test('Dado que o aproveitamento precisa ser verificável, quando o registro de aproveitamento for lido, então ele deve ter uma tabela com cada parte listada na pergunta 2, o caminho no repositório da V1, a classificação (Reaproveita, Adapta ou Descarta) e o motivo', () => {
  const linhas = registro('aproveitamento').split('\n').filter((linha) => linha.startsWith('|'))
  const caminhos = [
    'src/utils/loads.js', 'src/data/protocol.js', 'src/utils/protocolCsv.js',
    'src/utils/timerManager.js', 'src/utils/alarmSound.js',
    'src/lib/exerciseSource.js', 'src/lib/exercisePtDictionary.js', 'scripts/seedExercises.mjs',
    'src/components', 'src/pages', 'public/doom-faces', 'public/manifest.json',
    'supabase/functions', 'supabase/migrations',
  ]
  for (const caminho of caminhos) {
    const linha = linhas.find((l) => l.includes(`\`${caminho}`))
    assert.ok(linha, `a tabela não tem ${caminho}`)
    const celulas = linha.split('|').slice(1, -1).map((c) => c.trim())
    assert.ok(celulas.some((c) => /^\*{0,2}(Reaproveita|Adapta|Descarta)\*{0,2}$/.test(c)), `${caminho} sem classificação`)
    assert.ok(celulas.at(-1).length > 10, `${caminho} sem motivo`)
  }
})

test('Dado que a lógica de domínio da V1 e a do mock podem divergir, quando uma regra da V1 for diferente da regra do mock ou de docs/produto, então a divergência deve ser apontada no registro e a spike não deve escolher entre elas, conforme o AGENTS.md', () => {
  const divergencias = secao(registro('aproveitamento'), 'Divergências')
  assert.ok(divergencias, 'falta a seção Divergências')
  const itens = divergencias.split('\n').filter((linha) => /^\d+\. /.test(linha))
  assert.ok(itens.length >= 1, 'nenhuma divergência apontada')
  for (const item of itens) assert.match(item, /\?$/, `a divergência não termina em pergunta: ${item}`)
})

test('Dado que a spike só recomenda, quando o pull request for aberto, então ele deve conter apenas os registros em docs/decisoes, com status "proposta", e listar as issues de acompanhamento sugeridas', () => {
  for (const texto of registros()) {
    assert.match(texto, /^- Status: proposta$/m)
    assert.match(secao(texto, 'Issues de acompanhamento sugeridas') ?? '', /^- \S/m, 'falta a lista de issues de acompanhamento')
  }
})

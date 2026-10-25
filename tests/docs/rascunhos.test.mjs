// Critérios de aceite da issue #26 para os documentos. Rode com `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..')
const ler = (...caminho) => readFileSync(join(raiz, ...caminho), 'utf8')

test('Dado que as regras de negócio ainda são um rascunho, quando o arquivo docs/produto/rascunho-regras.md for lido, então ele deve trazer as regras do documento de origem sem reescrita, marcado como rascunho a ser validado pela #25', () => {
  const texto = ler('docs', 'produto', 'rascunho-regras.md')
  assert.match(texto.split('\n')[0], /Rascunho/)
  assert.match(texto.split('\n')[0], /#25/)
  for (const secao of ['Execução da sessão', 'Progressão, registro e histórico', 'Protocolo e agenda', 'Aderência e gamificação', 'Conflitos que pedem decisão']) {
    assert.match(texto, new RegExp(`^## ${secao}$`, 'm'))
  }
})

test('Dado que a arquitetura ainda será revisada, quando o arquivo docs/tecnico/rascunho-arquitetura.md for lido, então ele deve trazer o documento de arquitetura sem reescrita, marcado como rascunho a ser revisado', () => {
  const texto = ler('docs', 'tecnico', 'rascunho-arquitetura.md')
  assert.match(texto.split('\n')[0], /Rascunho, a ser revisado/)
  for (const secao of ['Onde estamos', 'Backend e dados', 'Segurança do app móvel', 'Migração do v1', 'Roadmap', 'Custos']) {
    assert.match(texto, new RegExp(`^## ${secao}$`, 'm'))
  }
})

test('Dado que o esquema real do v1 foi alterado pelo painel e não está nas migrações, quando o arquivo docs/tecnico/legado/esquema-v1.sql for lido, então ele deve trazer só a estrutura do banco do v1 no ar, sem nenhum dado: tabelas, colunas, políticas de RLS, funções, gatilhos, buckets do Storage e a lista das Edge Functions', () => {
  const sql = ler('docs', 'tecnico', 'legado', 'esquema-v1.sql')
  for (const tabela of ['profiles', 'user_data', 'workout_logs', 'exercise_history', 'saved_exercises', 'meal_logs', 'micro_logs', 'exercises_library']) {
    assert.match(sql, new RegExp(`create table public\\.${tabela} `))
  }
  assert.match(sql, /create policy/)
  assert.match(sql, /create or replace function public\.is_admin/)
  assert.match(sql, /create trigger on_auth_user_created/)
  assert.match(sql, /Bucket "exercises"/)
  for (const funcao of ['send-email', 'get-student-data', 'save-student-data', 'send-feedback', 'schedule-rest-push']) {
    assert.ok(sql.includes(funcao), `falta a Edge Function ${funcao}`)
  }
  assert.doesNotMatch(sql, /\binsert into\b(?! public\.profiles \(id, name, role\))/i, 'o arquivo não pode ter dados')
  assert.doesNotMatch(sql, /\bcopy\b.*\bfrom\b/i)
})

test('Dado que o repositório é público, quando o pull request for revisado, então nenhum dos arquivos deve conter chave, segredo ou dado de pessoa real', () => {
  const dirs = ['docs', 'design', 'tests']
  const padroes = [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, /sk_(live|test)_[A-Za-z0-9]+/, /\bre_[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, /service_role[\s:=]+['"]?eyJ/]
  const arquivos = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(dir, e.name)
      return e.isDirectory() ? (e.name === 'dist' ? [] : arquivos(caminho)) : [caminho]
    })
  const texto = new Set(['.md', '.sql', '.html', '.css', '.js', '.mjs', '.svg', '.txt'])
  for (const dir of dirs) {
    for (const arquivo of arquivos(join(raiz, dir)).filter((f) => texto.has(extname(f)) && !f.endsWith('babylon-mini.js') && statSync(f).size < 2_000_000)) {
      const conteudo = readFileSync(arquivo, 'utf8')
      // O aviso de copyright da licença OFL das fontes traz o contato público de quem as criou.
      const ehLicenca = arquivo.includes(join('assets', 'fontes', 'LICENSE-'))
      for (const padrao of ehLicenca ? padroes.filter((p) => !p.source.includes('@')) : padroes) assert.doesNotMatch(conteudo, padrao, `${arquivo} casa com ${padrao}`)
    }
  }
})

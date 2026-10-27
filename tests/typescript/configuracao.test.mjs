// Critérios de aceite da issue #48. Rode com `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..')
const ler = (...caminho) => readFileSync(join(raiz, ...caminho), 'utf8')
const pacote = () => JSON.parse(ler('package.json'))

test('Dado que o v2 usa só a sintaxe que o Node consegue apagar, quando o tsconfig.json for lido, então ele deve ter erasableSyntaxOnly e strict ligados', () => {
  const { compilerOptions } = JSON.parse(ler('tsconfig.json'))
  assert.equal(compilerOptions.erasableSyntaxOnly, true)
  assert.equal(compilerOptions.strict, true)
})

test('Dado que o lint precisa entender TypeScript, quando npm run lint rodar, então ele deve analisar arquivos .ts e .tsx com o typescript-eslint', async () => {
  const eslint = new ESLint({ cwd: raiz })
  for (const arquivo of ['src/a.ts', 'src/a.tsx']) {
    const config = await eslint.calculateConfigForFile(join(raiz, arquivo))
    assert.match(config.languageOptions.parser.meta.name, /typescript-eslint/)
  }
})

test('Dado que os tipos precisam ser conferidos no CI, quando um pull request for aberto, então o CI deve rodar um script typecheck', () => {
  assert.equal(pacote().scripts.typecheck, 'tsc --noEmit')
  assert.match(ler('.github', 'workflows', 'ci.yml'), /run: npm run typecheck/)
})

test('Dado que os tipos precisam ser conferidos no CI, quando houver erro de tipo, então o typecheck deve falhar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tipos-'))
  const arquivo = join(dir, 'erro.ts')
  writeFileSync(arquivo, 'const n: number = "texto"\nexport { n }\n')
  const tsc = join(raiz, 'node_modules', 'typescript', 'bin', 'tsc')
  const r = spawnSync(process.execPath, [tsc, '--noEmit', '--strict', 'erro.ts'], { cwd: dir, encoding: 'utf8' })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout, /TS2322/)
})

test('Dado que a versão do Node importa para apagar os tipos, quando o package.json for lido, então ele deve declarar a versão mínima do Node em engines', () => {
  assert.equal(pacote().engines.node, '>=22.18')
})

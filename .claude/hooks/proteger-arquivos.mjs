// Gancho PreToolUse para Edit e Write.
// Bloqueia a edição de migrações já existentes e pede confirmação de uma pessoa
// antes de o agente mudar o próprio contrato, as próprias permissões ou os workflows.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const entrada = JSON.parse(readFileSync(0, 'utf8') || '{}')
const alvo = entrada?.tool_input?.file_path
if (!alvo) process.exit(0)

const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd()
const relativo = path.relative(raiz, path.resolve(raiz, alvo)).split(path.sep).join('/')

function responder(decisao, motivo) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decisao,
      permissionDecisionReason: motivo,
    },
  }))
  process.exit(0)
}

if (relativo.startsWith('supabase/migrations/') && existsSync(path.resolve(raiz, alvo))) {
  responder('deny', 'Migração já existente não é editada. Crie uma migração nova com supabase migration new.')
}

const pedemConfirmacao = [
  'AGENTS.md',
  'CLAUDE.md',
  'supabase/AGENTS.md',
  'supabase/CLAUDE.md',
  '.github/CODEOWNERS',
]
const pastasQuePedemConfirmacao = ['.claude/', '.github/workflows/']

if (pedemConfirmacao.includes(relativo) || pastasQuePedemConfirmacao.some(p => relativo.startsWith(p))) {
  responder('ask', `${relativo} define as regras do agente ou do CI. Uma pessoa precisa confirmar esta mudança.`)
}

process.exit(0)

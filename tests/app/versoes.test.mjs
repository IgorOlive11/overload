// react e react-dom precisam da mesma versão: com versões diferentes, o app abre em branco (erro 527 do React).
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)

test('react e react-dom instalados têm a mesma versão', () => {
  assert.equal(require('react-dom/package.json').version, require('react/package.json').version)
})

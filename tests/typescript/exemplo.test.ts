// Prova que o runner do Node executa TypeScript sem passo de build (issue #48).
import { test } from 'node:test'
import assert from 'node:assert/strict'

type Carga = { kg: number; repeticoes: number }

const volume = (serie: Carga): number => serie.kg * serie.repeticoes

test('Dado que os testes rodam no runner do Node, quando npm test rodar, então um teste em .ts deve executar sem passo de build', () => {
  assert.equal(volume({ kg: 20, repeticoes: 10 }), 200)
})

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// O agente não altera .github/workflows/. O workflow novo vive em docs/tecnico
// até o dono copiá-lo; os testes conferem esse arquivo.
const workflow = readFileSync(new URL('../../docs/tecnico/mapa-workflow.yml', import.meta.url), 'utf8');

test('Dado que uma issue foi aberta, fechada, reaberta ou mudou de etiqueta, quando o evento acontecer, então o workflow roda na hora e o mapa é redesenhado', () => {
  assert.match(workflow, /^on:\n\s+issues:\n\s+types: \[opened, closed, reopened, labeled, unlabeled\]/m);
  assert.match(workflow, /node \.github\/mapa\/gerar-mapa\.mjs/);
});

test('Dado que mudanças de Status e de bloqueio não geram evento para o Actions, quando passarem 5 minutos, então o workflow roda pelo agendamento e o mapa reflete essas mudanças', () => {
  assert.match(workflow, /cron: '\*\/5 \* \* \* \*'/);
});

test('Dado que o PO quer forçar a atualização, quando ele usar o botão Run workflow, então o mapa é redesenhado', () => {
  assert.match(workflow, /^\s+workflow_dispatch:/m);
});

test('o passo do mapa vem depois da sincronização da etiqueta', () => {
  assert.ok(workflow.indexOf('Pôr e tirar a etiqueta') < workflow.indexOf('Redesenhar o mapa'));
});

test('Dado que a issue do mapa não é uma tarefa, quando o workflow de sincronização rodar, então ela não ganha a etiqueta pronta-para-agente e fica fora das contas de progresso', () => {
  assert.match(workflow, /MAPA_ISSUE: '63'/);
  assert.match(workflow, /\.content\.number != \$mapa/);
  assert.match(workflow, /\$do_po \| not/);
});

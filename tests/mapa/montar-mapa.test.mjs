import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarMapa, corpoAtualizado, estadoDaTarefa, MARCADOR } from '../../.github/mapa/montar-mapa.mjs';

const t = (numero, etiquetas, estado = 'open', bloqueadaPor = []) => ({
  numero, titulo: `Tarefa ${numero}`, estado, etiquetas, bloqueadaPor,
});

const fases = [
  {
    titulo: 'Fase 1',
    epicos: [
      { numero: 10, titulo: 'Épico A', tarefas: [t(1, [], 'closed'), t(2, ['pronta-para-agente'], 'open', [1]), t(3, ['tarefa-do-po']), t(4, [], 'open', [2])] },
    ],
  },
  { titulo: 'Fase 2', epicos: [{ numero: 20, titulo: 'Épico B', tarefas: [t(5, [])] }, { numero: 21, titulo: 'Épico C', tarefas: [t(6, [])] }] },
];

test('Dado que a issue "Mapa de execução" for aberta, quando ela for aberta, então ela mostra a árvore com fases, épicos, tarefas e setas de bloqueio, e cada tarefa tem a cor do seu estado com uma legenda', () => {
  const m = montarMapa(fases);
  assert.ok(m.startsWith(MARCADOR));
  assert.match(m, /subgraph f0\["Fase 1"\]/);
  assert.match(m, /subgraph f0e0\["#10 Épico A"\]/);
  assert.match(m, /t1\["#1 Tarefa 1"\]:::concluida/);
  assert.match(m, /t2\["#2 Tarefa 2"\]:::liberada/);
  assert.match(m, /t3\["#3 Tarefa 3"\]:::po/);
  assert.match(m, /t4\["#4 Tarefa 4"\]:::bloqueada/);
  assert.match(m, /t1 --> t2/);
  assert.match(m, /t2 --> t4/);
  for (const c of ['concluida', 'liberada', 'po', 'bloqueada']) assert.match(m, new RegExp(`classDef ${c} `));
  assert.match(m, /### Legenda/);
});

test('Dado que o mapa é regerado o tempo todo, quando nada mudou desde a última execução, então a descrição da issue não é reescrita', () => {
  const novo = montarMapa(fases);
  assert.equal(corpoAtualizado(novo, novo), null);
  assert.equal(corpoAtualizado(novo + '\n', novo), null);
  assert.equal(corpoAtualizado('outro texto', novo), novo);
});

test('Dado que o mapa precisa caber na leitura, quando uma fase ainda não começou, então ela aparece recolhida, com o nome e a quantidade de épicos', () => {
  const m = montarMapa(fases);
  assert.match(m, /f1\["Fase 2 · 2 épicos"\]:::recolhida/);
  assert.doesNotMatch(m, /t5\[/);
  assert.doesNotMatch(m, /subgraph f1/);
});

test('o estado da tarefa segue a etiqueta, e a do PO nunca aparece como liberada', () => {
  assert.equal(estadoDaTarefa(t(1, ['tarefa-do-po', 'pronta-para-agente'])), 'po');
  assert.equal(estadoDaTarefa(t(1, ['pronta-para-agente'], 'closed')), 'concluida');
});

test('seta para tarefa de fase recolhida é omitida', () => {
  const m = montarMapa([fases[0], { titulo: 'F2', epicos: [{ numero: 30, titulo: 'E', tarefas: [t(7, [], 'open', [2])] }] }]);
  assert.doesNotMatch(m, /t2 --> t7/);
});

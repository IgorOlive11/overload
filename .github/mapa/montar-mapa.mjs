// Função pura: recebe as issues já lidas da API e devolve o Markdown do mapa.
// Não faz rede, para ser testável com dados de exemplo.

export const MARCADOR = '<!-- mapa-de-execucao -->';

const ESTADOS = {
  concluida: { cor: 'fill:#4b5563,stroke:#1f2937,color:#fff' },
  liberada: { cor: 'fill:#16a34a,stroke:#14532d,color:#fff' },
  po: { cor: 'fill:#2563eb,stroke:#1e3a8a,color:#fff' },
  bloqueada: { cor: 'fill:#f59e0b,stroke:#78350f,color:#000' },
};

export function estadoDaTarefa(tarefa) {
  if (tarefa.estado === 'closed') return 'concluida';
  if (tarefa.etiquetas.includes('tarefa-do-po')) return 'po';
  if (tarefa.etiquetas.includes('pronta-para-agente')) return 'liberada';
  return 'bloqueada';
}

const limpar = (texto) => texto.replace(/"/g, "'").replace(/[\r\n]+/g, ' ');

// Uma fase "não começou" quando nenhuma tarefa dela foi concluída nem liberada.
function faseComecou(fase) {
  return fase.epicos
    .flatMap((e) => e.tarefas)
    .some((t) => ['concluida', 'liberada'].includes(estadoDaTarefa(t)));
}

/**
 * fases: [{ titulo, epicos: [{ numero, titulo, tarefas: [
 *   { numero, titulo, estado: 'open'|'closed', etiquetas: [], bloqueadaPor: [numero] }
 * ] }] }]
 */
export function montarMapa(fases) {
  const linhas = ['flowchart LR'];
  const desenhadas = new Set();
  const setas = [];

  fases.forEach((fase, i) => {
    const id = `f${i}`;
    if (!faseComecou(fase)) {
      const n = fase.epicos.length;
      linhas.push(`  ${id}["${limpar(fase.titulo)} · ${n} ${n === 1 ? 'épico' : 'épicos'}"]:::recolhida`);
      return;
    }
    linhas.push(`  subgraph ${id}["${limpar(fase.titulo)}"]`);
    fase.epicos.forEach((epico, j) => {
      linhas.push(`    subgraph ${id}e${j}["#${epico.numero} ${limpar(epico.titulo)}"]`);
      for (const t of epico.tarefas) {
        linhas.push(`      t${t.numero}["#${t.numero} ${limpar(t.titulo)}"]:::${estadoDaTarefa(t)}`);
        desenhadas.add(t.numero);
        for (const b of t.bloqueadaPor) setas.push([b, t.numero]);
      }
      linhas.push('    end');
    });
    linhas.push('  end');
  });

  for (const [de, para] of setas) {
    if (desenhadas.has(de) && desenhadas.has(para)) linhas.push(`  t${de} --> t${para}`);
  }

  linhas.push('  classDef recolhida fill:#e5e7eb,stroke:#9ca3af,color:#374151,stroke-dasharray:4');
  for (const [classe, e] of Object.entries(ESTADOS)) linhas.push(`  classDef ${classe} ${e.cor}`);

  return [
    MARCADOR,
    '',
    'Mapa gerado sozinho pelo workflow `Sincronizar etiqueta com o Status`. Não edite à mão.',
    'Uma seta vai de quem bloqueia para quem é bloqueado.',
    '',
    '```mermaid',
    ...linhas,
    '```',
    '',
    '### Legenda',
    '',
    '| Cor | Estado |',
    '|---|---|',
    '| 🟩 verde | Liberada para o agente |',
    '| 🟦 azul | Tarefa do PO |',
    '| 🟧 laranja | Bloqueada ou sem etiqueta |',
    '| ⬛ cinza escuro | Concluída |',
    '| ⬜ cinza claro tracejado | Fase que ainda não começou, recolhida |',
    '',
  ].join('\n');
}

// Devolve o corpo novo só se ele difere do atual; senão null (não reescrever).
export function corpoAtualizado(atual, novo) {
  return (atual ?? '').trim() === novo.trim() ? null : novo;
}

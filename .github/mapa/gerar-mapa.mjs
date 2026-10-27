// Lê as issues, os épicos, os bloqueios e os milestones do repositório e
// redesenha o mapa na descrição da issue do mapa. Só lê; só escreve nessa issue.
// Variáveis: GITHUB_TOKEN, GITHUB_REPOSITORY, MAPA_ISSUE (número da issue do mapa).
import { MARCADOR, montarMapa, corpoAtualizado } from './montar-mapa.mjs';

const { GITHUB_TOKEN, GITHUB_REPOSITORY, MAPA_ISSUE } = process.env;
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !MAPA_ISSUE) {
  console.error('Faltam GITHUB_TOKEN, GITHUB_REPOSITORY ou MAPA_ISSUE.');
  process.exit(1);
}
const API = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;
const cabecalhos = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function chamar(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}/${caminho}`, { ...opcoes, headers: cabecalhos });
  if (!resposta.ok) throw new Error(`${caminho}: ${resposta.status} ${await resposta.text()}`);
  return resposta.json();
}

async function listar(caminho) {
  const itens = [];
  for (let pagina = 1; ; pagina++) {
    const sep = caminho.includes('?') ? '&' : '?';
    const lote = await chamar(`${caminho}${sep}per_page=100&page=${pagina}`);
    itens.push(...lote);
    if (lote.length < 100) return itens;
  }
}

const mapa = await chamar(`issues/${MAPA_ISSUE}`);
if (!(mapa.body ?? '').includes(MARCADOR)) {
  console.error(`A #${MAPA_ISSUE} não tem o marcador ${MARCADOR} no corpo.`);
  process.exit(1);
}

// A issue do mapa e os pull requests ficam fora das contas.
const issues = (await listar('issues?state=all')).filter(
  (i) => !i.pull_request && i.number !== mapa.number,
);
const milestones = (await listar('milestones?state=all')).sort((a, b) => a.number - b.number);

const epicos = issues.filter((i) => (i.sub_issues_summary?.total ?? 0) > 0);
const nomes = (i) => i.labels.map((l) => l.name);

const fases = [];
for (const milestone of [...milestones, null]) {
  const doEpico = epicos.filter((e) => (e.milestone?.number ?? null) === (milestone?.number ?? null));
  if (doEpico.length === 0) continue;
  const lista = [];
  for (const epico of doEpico) {
    const filhas = await listar(`issues/${epico.number}/sub_issues`);
    const tarefas = [];
    for (const t of filhas.filter((f) => f.number !== mapa.number)) {
      const bloqueios =
        t.state === 'open' ? await listar(`issues/${t.number}/dependencies/blocked_by`) : [];
      tarefas.push({
        numero: t.number,
        titulo: t.title,
        estado: t.state,
        etiquetas: nomes(t),
        bloqueadaPor: bloqueios.filter((b) => b.state === 'open').map((b) => b.number),
      });
    }
    lista.push({ numero: epico.number, titulo: epico.title, tarefas });
  }
  fases.push({ titulo: milestone?.title ?? 'Sem fase', epicos: lista });
}

const novo = montarMapa(fases);
if (corpoAtualizado(mapa.body, novo) === null) {
  console.log('Nada mudou. A descrição não foi reescrita.');
} else {
  await chamar(`issues/${MAPA_ISSUE}`, {
    method: 'PATCH',
    body: JSON.stringify({ body: novo }),
  });
  console.log(`Mapa atualizado na #${MAPA_ISSUE}.`);
}

// CSV do protocolo: mesmas colunas da v1 (uma linha por série) e duas novas no fim, agenda e fase_semanas.
// Importar devolve um rascunho e um relatório; quem chama só substitui o protocolo depois da confirmação.
import { MUSCULOS } from "./tipos.ts";
import type { Biblioteca, DiaDoPlano, ExercicioDoPlano, Protocolo, Serie } from "./tipos.ts";

export const CABECALHO = ["semana", "dia", "descanso_seg", "prep_seg", "dia_descanso", "exercicio", "musculo", "tipo_serie", "ger", "rep_range", "musculo_acessorio", "prep_override", "biblioteca_id", "apelido_pt", "agenda", "fase_semanas"] as const;

/* GER fixo dos tipos especiais, gravado na coluna ger como na v1. */
const GER_DO_TIPO = { REST_PAUSE: 12, MUSCLE_ROUND: 11 } as const;
const TIPOS = new Set(["NORMAL", "REST_PAUSE", "MUSCLE_ROUND"]);

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Célula que começa com =, +, - ou @ vira texto, para o Excel não executar fórmula escondida no arquivo. */
export function celula(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s;
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function exportarCsv(p: Protocolo, bib: Biblioteca): string {
  const linhas = [CABECALHO.join(",")];
  p.dias.forEach((dia, i) => {
    const n = i + 1, fim = [p.agenda, p.camada.semanas];
    const vazia = ["", "", "", "", "", "", "", "", ""];
    if (dia.folga) { linhas.push([1, n, "", "", "S", ...vazia, ...fim].map(celula).join(",")); return; }
    if (!dia.exercicios.length) { linhas.push([1, n, p.descanso, p.descansoPreparo, "N", ...vazia, ...fim].map(celula).join(",")); return; }
    for (const e of dia.exercicios) {
      const L = bib[e.id];
      if (!L) continue;
      for (const s of e.series) {
        linhas.push([1, n, e.descanso || p.descanso, e.descansoPreparo || p.descansoPreparo, "N", L.nome, L.musculo, s.tipo,
          s.tipo === "NORMAL" ? s.ger : GER_DO_TIPO[s.tipo], s.tipo === "NORMAL" ? s.faixa.join("-") : "",
          (e.acessorios ?? L.acessorios).join("|"), e.preparo === "auto" ? "" : e.preparo, e.id, "", ...fim].map(celula).join(","));
      }
    }
  });
  return linhas.join("\n");
}

/* Separa as células aceitando vírgula ou ponto e vírgula (Excel em português), aspas e quebra de linha dentro de aspas. */
export function dividirCsv(texto: string): string[][] {
  const out: string[][] = [];
  let linha: string[] = [], cel = "", aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { cel += '"'; i++; } else aspas = false; } else cel += c;
      continue;
    }
    if (c === '"') aspas = true;
    else if (c === "," || c === ";") { linha.push(cel); cel = ""; }
    else if (c === "\n") { linha.push(cel); out.push(linha); linha = []; cel = ""; }
    else if (c !== "\r") cel += c;
  }
  if (cel !== "" || linha.length) { linha.push(cel); out.push(linha); }
  return out.filter(r => r.some(x => x.trim() !== ""));
}

export type Importacao =
  | { ok: true; rascunho: Protocolo; resumo: string; avisos: string[] }
  | { ok: false; erro: string };

const diasDeTreino = (p: Protocolo) => p.dias.filter(x => !x.folga && x.exercicios.length).length;

export function importarCsv(texto: string, bib: Biblioteca): Importacao {
  const linhas = dividirCsv(texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto);
  if (linhas.length < 2) return { ok: false, erro: "O arquivo está vazio ou tem só o cabeçalho." };
  const cab = linhas[0].map(h => h.trim().toLowerCase()), col = (n: string) => cab.indexOf(n);
  const faltam = ["semana", "dia", "exercicio"].filter(h => col(h) < 0);
  if (faltam.length) return { ok: false, erro: `Faltam as colunas ${faltam.join(", ")}. Use o modelo.` };
  const get = (r: string[], n: string) => col(n) < 0 ? "" : String(r[col(n)] ?? "").trim();
  const corpo = linhas.slice(1);
  const semanas = new Set(corpo.map(r => parseInt(get(r, "semana"), 10) || 1)), s1 = Math.min(...semanas);
  const p: Protocolo = {
    agenda: "semana", descanso: 120, descansoPreparo: 40,
    camada: { fase: true, semanas: 6, meta: true, metaN: 2, nuncaDuas: true },
    dias: Array.from({ length: 7 }, (): DiaDoPlano => ({ folga: false, exercicios: [] }))
  };
  const avisos: string[] = [], semVinculo = new Set<string>(), convertidos: Record<string, number> = {};
  let series = 0, descansoVisto: number | null = null, preparoVisto: number | null = null;
  let ultimo: { dia: number; nome: string; ex: ExercicioDoPlano } | null = null;
  const ids = Object.keys(bib);

  for (const r of corpo) {
    if ((parseInt(get(r, "semana"), 10) || 1) !== s1) continue;
    const n = parseInt(get(r, "dia"), 10);
    if (!(n >= 1 && n <= 7)) continue;
    const dia = p.dias[n - 1];
    const agenda = get(r, "agenda");
    if (agenda === "sequencia" || agenda === "semana") p.agenda = agenda;
    const fs = parseInt(get(r, "fase_semanas"), 10);
    if (fs) p.camada.semanas = fs;
    if (get(r, "dia_descanso").toUpperCase() === "S") { dia.folga = true; ultimo = null; continue; }
    const nome = get(r, "exercicio");
    if (!nome) { ultimo = null; continue; }
    const lid = get(r, "biblioteca_id"), apelido = normalizar(get(r, "apelido_pt"));
    const id = Object.hasOwn(bib, lid) ? lid : ids.find(k => normalizar(bib[k].nome) === normalizar(nome) || normalizar(bib[k].nome) === apelido);
    if (!id) { semVinculo.add(nome); ultimo = null; continue; }
    const ds = parseInt(get(r, "descanso_seg"), 10) || null, ps = parseInt(get(r, "prep_seg"), 10) || null;
    if (descansoVisto == null && ds) descansoVisto = ds;
    if (preparoVisto == null && ps) preparoVisto = ps;
    let ex: ExercicioDoPlano | null = ultimo && ultimo.dia === n && ultimo.nome === nome ? ultimo.ex : null;
    if (!ex) {
      const po = get(r, "prep_override"), acc = get(r, "musculo_acessorio");
      ex = {
        id, series: [],
        preparo: po === "" ? "auto" : Math.max(0, Math.min(3, parseInt(po, 10) || 0)) as 0 | 1 | 2 | 3,
        acessorios: acc ? acc.split("|").map(a => a.trim().toUpperCase()).filter(a => (MUSCULOS as readonly string[]).includes(a)) : bib[id].acessorios.slice(),
        descanso: ds, descansoPreparo: ps
      };
      dia.exercicios.push(ex);
      ultimo = { dia: n, nome, ex };
    }
    let tipo = get(r, "tipo_serie").toUpperCase() || "NORMAL";
    const g = parseInt(get(r, "ger"), 10), fx = get(r, "rep_range").split("-").map(x => parseInt(x, 10));
    if (!TIPOS.has(tipo)) { convertidos[tipo] = (convertidos[tipo] ?? 0) + 1; tipo = "NORMAL"; }
    const serie: Serie = tipo === "NORMAL"
      ? { tipo: "NORMAL", ger: g >= 7 && g <= 13 ? g : 9, faixa: fx.length === 2 && fx.every(x => x > 0) ? [fx[0], fx[1]] : [8, 12] }
      : { tipo: tipo as "REST_PAUSE" | "MUSCLE_ROUND" };
    ex.series.push(serie);
    series++;
  }

  for (const dia of p.dias) {
    dia.exercicios = dia.exercicios.filter(e => e.series.length);
    if (!dia.folga && !dia.exercicios.length) dia.folga = true;
  }
  p.descanso = [60, 90, 120, 150, 180].includes(descansoVisto ?? -1) ? descansoVisto! : 120;
  p.descansoPreparo = [30, 40, 60].includes(preparoVisto ?? -1) ? preparoVisto! : 40;
  for (const dia of p.dias) for (const e of dia.exercicios) {
    if (e.descanso === p.descanso) e.descanso = null;
    if (e.descansoPreparo === p.descansoPreparo) e.descansoPreparo = null;
  }
  const w = p.camada.semanas;
  if (![4, 6, 8].includes(w)) p.camada.semanas = w > 6 ? 8 : w > 4 ? 6 : 4;
  p.camada.metaN = Math.max(1, Math.min(5, p.dias.filter(x => !x.folga).length));

  if (semanas.size > 1) avisos.push(`O arquivo tem ${semanas.size} semanas. O v2 usa uma semana modelo repetida pela fase, então só a semana ${s1} entrou e a fase ficou com ${p.camada.semanas} semanas.`);
  for (const t of Object.keys(convertidos)) {
    const c = convertidos[t];
    avisos.push(`${c} ${c > 1 ? "séries" : "série"} do tipo ${t}, que saiu do v2, ${c > 1 ? "viraram séries normais" : "virou série normal"}. Revise a reserva e a faixa.`);
  }
  if (semVinculo.size) avisos.push(`Sem vínculo na biblioteca, ficaram de fora: ${[...semVinculo].join(", ")}.`);
  const nEx = p.dias.reduce((a, x) => a + x.exercicios.length, 0);
  return { ok: true, rascunho: p, resumo: `${diasDeTreino(p)} dias de treino, ${nEx} exercícios e ${series} séries lidos.`, avisos };
}

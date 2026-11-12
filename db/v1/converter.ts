// Conversão dos dados do v1 (Supabase "ultima-wepon") para o modelo do v2, sem tocar em banco: entra o JSON do v1, sai o que gravar.
// Decisões do PO em 12/11 (no chat): a semana-tipo é a semana em que a pessoa parou; série pulse vira normal com a mesma faixa e GER;
// a biblioteca entra inteira, com o equipamento em categoria automática (o que não cabe vira máquina de placas);
// os 17 GIFs do bucket do Supabase passam a ser servidos pelo próprio app, em /biblioteca.
import { randomUUID } from "node:crypto";
import { chaveDoExercicio, configuracao } from "../../src/domain/historico.ts";
import type { Equipamento, Serie } from "../../src/domain/tipos.ts";

const MUSCULOS = ["COSTAS", "PEITO", "OMBROS", "TRÍCEPS", "BÍCEPS", "QUADRÍCEPS", "POSTERIOR", "GLÚTEOS", "ADUTORES", "PANTURRILHA", "CORE"];
type J = Record<string, unknown>;
const obj = (x: unknown): J => (x && typeof x === "object" && !Array.isArray(x) ? x as J : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : typeof x === "string" && x.trim() && Number.isFinite(Number(x)) ? Number(x) : null);
const txt = (x: unknown): string => (typeof x === "string" ? x : "");

/* ---------- biblioteca ---------- */

const ALVO: Record<string, string> = {
  abductors: "GLÚTEOS", abs: "CORE", adductors: "ADUTORES", biceps: "BÍCEPS", calves: "PANTURRILHA", "cardiovascular system": "CORE",
  delts: "OMBROS", forearms: "BÍCEPS", glutes: "GLÚTEOS", hamstrings: "POSTERIOR", lats: "COSTAS", "levator scapulae": "COSTAS",
  pectorals: "PEITO", quads: "QUADRÍCEPS", "serratus anterior": "PEITO", spine: "COSTAS", traps: "COSTAS", triceps: "TRÍCEPS", "upper back": "COSTAS"
};
const SECUNDARIO: Record<string, string> = {
  ...ALVO, abdominals: "CORE", core: "CORE", "lower abs": "CORE", obliques: "CORE", "hip flexors": "CORE",
  back: "COSTAS", "latissimus dorsi": "COSTAS", "lower back": "COSTAS", rhomboids: "COSTAS", trapezius: "COSTAS",
  brachialis: "BÍCEPS", soleus: "PANTURRILHA", chest: "PEITO", "upper chest": "PEITO", deltoids: "OMBROS", "rear deltoids": "OMBROS",
  shoulders: "OMBROS", "rotator cuff": "OMBROS", groin: "ADUTORES", "inner thighs": "ADUTORES", quadriceps: "QUADRÍCEPS"
};
export function musculoDoV1(m: string, secundario = false): string | null {
  const up = m.trim().toUpperCase();
  if (MUSCULOS.includes(up)) return up;
  return (secundario ? SECUNDARIO : ALVO)[m.trim().toLowerCase()] ?? null;
}

export function equipamentoDoV1(lista: readonly string[]): Equipamento {
  const e = (lista[0] ?? "").trim().toLowerCase();
  if (["barbell", "olympic barbell", "ez barbell", "trap bar", "barra"].includes(e)) return "barra";
  if (["smith machine", "smith", "máquina (smith)"].includes(e)) return "smith";
  if (["leverage machine", "sled machine"].includes(e)) return "carregada";
  if (["dumbbell", "halter", "halteres", "kettlebell"].includes(e)) return "halteres";
  // Polia, máquina e tudo o que não cabe numa categoria (peso do corpo, elástico, bola...): máquina de placas.
  return "pilha";
}

export interface ItemV1 {
  id: string; name: string; name_pt: string | null; gif_url: string; target_muscles: string[]; secondary_muscles: string[];
  equipments: string[]; body_parts: string[]; instructions: string[]; instructions_pt: string[] | null;
}
export interface ItemV2 {
  id: string; nome: string; nomePt: string | null; gifUrl: string | null; musculo: string; acessorios: string[];
  equipamento: Equipamento; pilhaKg: number | null; partes: string[]; instrucoes: string[]; instrucoesPt: string[] | null;
}

const GIF_DO_SUPABASE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/exercises\/([A-Za-z0-9._-]+\.gif)$/;

export function itemDaBiblioteca(i: ItemV1): ItemV2 {
  const musculo = i.target_muscles.map(m => musculoDoV1(m)).find(Boolean) ?? "CORE";
  const acessorios = [...new Set(i.secondary_muscles.map(m => musculoDoV1(m, true)).filter((m): m is string => !!m && m !== musculo))];
  const gif = GIF_DO_SUPABASE.exec(i.gif_url);
  return {
    id: i.id, nome: i.name.trim().slice(0, 120), nomePt: i.name_pt, gifUrl: gif ? `/biblioteca/${gif[1]}` : i.gif_url,
    musculo, acessorios, equipamento: equipamentoDoV1(i.equipments), pilhaKg: null, partes: i.body_parts ?? [], instrucoes: i.instructions, instrucoesPt: i.instructions_pt
  };
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

/* ---------- conta ---------- */

export interface ContaV1 {
  id: string; email: string; nome: string | null; senhaHash: string; confirmadoEm: string | null; criadaEm: string;
  secoes: Record<string, unknown>;
}

export interface SessaoV2 { id: string; dia: number; indiceTreino: number; diaLocal: string; iniciadaEm: string; terminadaEm: string }
export interface RegistroV2 {
  id: string; sessaoId: string; exercicioChave: string; configuracao: string; passo: "calibracao" | "preparo" | "valida"; ordem: number;
  tipo: "NORMAL" | "REST_PAUSE" | "MUSCLE_ROUND" | null; kg: number; reps: number | null; ger: number | null;
  b1: number | null; b2: number | null; blocos: number | null; ultimo: number | null; feitoEm: string;
}
export interface ExercicioDoProtocolo {
  id: string; bibliotecaId: string; nome: null; musculo: null; equipamento: null; apelido: null; acessorios: string[] | null;
  preparo: "auto" | 0 | 1 | 2 | 3; descanso: number | null; descansoPreparo: number | null; series: Serie[];
}
export interface ProtocoloV2 {
  versao: null; agenda: "semana"; descanso: number; descansoPreparo: number;
  camada: { fase: boolean; semanas: number; meta: boolean; metaN: number; nuncaDuas: boolean };
  dias: { folga: boolean; nome: string; exercicios: ExercicioDoProtocolo[] }[];
}
export interface ContaMigrada {
  conta: { id: string; email: string; nome: string; senhaHash: string; confirmadoEm: string | null; criadaEm: string };
  protocolo: ProtocoloV2 | null;
  sessoes: SessaoV2[];
  registros: RegistroV2[];
  /* Exercícios do v1 sem item na biblioteca: entram na biblioteca para o protocolo e o histórico ficarem ligados. */
  novosItens: ItemV2[];
  avisos: string[];
}

/* A data do calendário em São Paulo, para presença e semana da fase. */
export const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const diaDaSemanaLocal = (iso: string) => (new Date(diaLocal(iso) + "T12:00:00Z").getUTCDay() + 6) % 7;

const faixaDe = (t: string): [number, number] | null => {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(t.trim());
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return a >= 1 && b <= 50 && a < b ? [a, b] : null;
};
const clamp = (v: number | null, min: number, max: number) => (v == null ? null : Math.max(min, Math.min(max, Math.round(v))));

/* Séries do protocolo do v1. Pulse vira normal com a mesma faixa e GER (decisão do PO). */
function seriesDoV1(sets: unknown[]): Serie[] {
  const faixas = sets.map(s => faixaDe(txt(obj(s).repRange))).filter(Boolean) as [number, number][];
  const padrao: [number, number] = faixas[0] ?? [8, 12];
  return sets.map(s => {
    const o = obj(s), tipo = txt(o.type).toUpperCase();
    if (tipo === "REST_PAUSE" || tipo === "MUSCLE_ROUND") return { tipo } as Serie;
    const ger = num(o.ger);
    return { tipo: "NORMAL", ger: ger != null && ger >= 7 && ger <= 13 ? Math.round(ger) : 8, faixa: faixaDe(txt(o.repRange)) ?? padrao };
  });
}

/* A semana em que a pessoa parou: a do último treino registrado; sem treino, a semana 1 (decisão do PO). */
export function semanaParada(sessoes: unknown[], total: number): number {
  const ult = sessoes.map(obj).filter(s => txt(s.completedAt) || txt(s.startedAt))
    .sort((a, b) => (txt(a.completedAt) || txt(a.startedAt)).localeCompare(txt(b.completedAt) || txt(b.startedAt))).at(-1);
  const w = num(ult?.weekIdx);
  return w != null && w >= 0 && w < total ? w : 0;
}

export function migrarConta(c: ContaV1, biblioteca: ReadonlyMap<string, ItemV2>): ContaMigrada {
  const avisos: string[] = [];
  const novosItens = new Map<string, ItemV2>();
  const S = c.secoes;
  const protocoloV1 = obj(S.userProtocol), semanas = arr(protocoloV1.weeks);
  const sessoesV1 = arr(S.workoutSessions);
  const porNome = new Map<string, string>([...biblioteca.values()].flatMap(i => [[i.nome.toLowerCase(), i.id], ...(i.nomePt ? [[i.nomePt.toLowerCase(), i.id] as [string, string]] : [])]));

  // Nome do exercício no v1 → item da biblioteca: pelo libraryId do protocolo ou dos salvos, pelo nome, ou um item novo.
  const doV1 = new Map<string, string>();
  const ligar = (e: J) => {
    const nome = txt(e.name).trim(); if (!nome) return null;
    const k = nome.toLowerCase();
    const lib = txt(e.libraryId);
    if (lib && biblioteca.has(lib)) { if (!doV1.has(k)) doV1.set(k, lib); return lib; }
    if (doV1.has(k)) return doV1.get(k)!;
    const achado = porNome.get(k);
    if (achado) { doV1.set(k, achado); return achado; }
    const musculo = musculoDoV1(txt(e.muscle)) ?? "CORE";
    const ac = musculoDoV1(txt(e.accessoryMuscle), true);
    const id = `v1-${slug(nome) || "exercicio"}`;
    if (!biblioteca.has(id) && !novosItens.has(id)) {
      novosItens.set(id, { id, nome: nome.slice(0, 120), nomePt: nome.slice(0, 120), gifUrl: null, musculo, acessorios: ac && ac !== musculo ? [ac] : [], equipamento: "pilha", pilhaKg: null, partes: [], instrucoes: [], instrucoesPt: null });
      avisos.push(`Exercício sem item na biblioteca entrou como ${id} (máquina de placas).`);
    }
    doV1.set(k, id);
    return id;
  };
  semanas.forEach(w => arr(obj(w).days).forEach(d => arr(obj(d).exercises).forEach(e => ligar(obj(e)))));
  arr(S.savedExercises).forEach(e => ligar(obj(e)));

  // Protocolo: a semana em que a pessoa parou vira a semana-tipo.
  let protocolo: ProtocoloV2 | null = null;
  const configDoProtocolo = new Map<string, { series: Serie[]; config: string }>();
  if (semanas.length) {
    const w = semanaParada(sessoesV1, semanas.length);
    const dias = arr(obj(semanas[w]).days);
    const descansos = dias.map(d => num(obj(d).restSeconds)).filter((x): x is number => x != null);
    const descanso = clamp(descansos.sort((a, b) => descansos.filter(x => x === b).length - descansos.filter(x => x === a).length)[0] ?? 120, 15, 600)!;
    const conv = Array.from({ length: 7 }, (_, i) => {
      const d = obj(dias[i]);
      const exercicios: ExercicioDoProtocolo[] = arr(d.exercises).map(obj).flatMap(e => {
        const sets = arr(e.sets);
        const bibliotecaId = ligar(e);
        if (!bibliotecaId || !sets.length) return [];
        const series = seriesDoV1(sets);
        const p = num(e.prepSetsOverride);
        const ac = musculoDoV1(txt(e.accessoryMuscle), true);
        const ex: ExercicioDoProtocolo = {
          id: randomUUID(), bibliotecaId, nome: null, musculo: null, equipamento: null, apelido: null,
          acessorios: ac ? [ac] : null, preparo: p != null && p >= 0 && p <= 3 ? (Math.round(p) as 0 | 1 | 2 | 3) : "auto",
          descanso: clamp(num(d.restSeconds), 15, 600), descansoPreparo: clamp(num(d.prepRestSeconds) ?? num(d.feederRestSeconds), 10, 300), series
        };
        if (ex.descanso === descanso) ex.descanso = null;
        configDoProtocolo.set(chaveDoExercicio(bibliotecaId), { series, config: configuracao(series) });
        return [ex];
      });
      return { folga: !!d.isRest || !exercicios.length, nome: "", exercicios };
    });
    const treinos = conv.filter(d => !d.folga).length;
    if (treinos) {
      protocolo = {
        versao: null, agenda: "semana", descanso, descansoPreparo: 40,
        camada: { fase: true, semanas: 6, meta: true, metaN: Math.max(1, Math.min(5, treinos)), nuncaDuas: true }, dias: conv
      };
      if (w) avisos.push(`Semana-tipo: semana ${w + 1} do v1.`);
    } else avisos.push("O protocolo do v1 não tem treino com exercício; a conta entra sem protocolo.");
  }
  const diasDeTreino = protocolo ? protocolo.dias.map((d, i) => (d.folga ? -1 : i)).filter(i => i >= 0) : [];

  // Histórico: cada registro de exercício do v1 (o último de cada posição, o que está em history e o exerciseHistory), sem repetir.
  const entradas = new Map<string, J>();
  const juntar = (e: J, nome?: string) => {
    const n = (nome ?? txt(e.name)).trim(), data = txt(e.date);
    if (!n || !data || Number.isNaN(Date.parse(data))) return;
    // O mesmo registro aparece em mais de um lugar (logs, history, exerciseHistory): fica o mais completo.
    const k = `${n.toUpperCase()}|${data}`, antes = entradas.get(k);
    if (!antes || arr(e.sets).length > arr(antes.sets).length) entradas.set(k, { ...e, name: n });
  };
  Object.values(obj(S.logs)).map(obj).forEach(e => { juntar(e); arr(e.history).forEach(h => juntar(obj(h))); });
  Object.entries(obj(S.exerciseHistory)).forEach(([nome, e]) => juntar(obj(e), nome));

  // Sessões: as do workoutSessions; o registro entra na sessão em que foi feito (até 10 minutos depois do fim).
  const sessoes: (SessaoV2 & { ini: number; fim: number })[] = sessoesV1.map(obj).filter(s => !Number.isNaN(Date.parse(txt(s.startedAt))))
    .map(s => {
      const ini = Date.parse(txt(s.startedAt));
      const fim = Math.max(ini, Date.parse(txt(s.completedAt)) || ini + (num(s.durationSec) ?? 3600) * 1000);
      const dia = num(s.dayIdx);
      const iniciadaEm = new Date(ini).toISOString();
      return { id: randomUUID(), dia: dia != null && dia >= 0 && dia <= 6 ? dia : diaDaSemanaLocal(iniciadaEm), indiceTreino: 0, diaLocal: diaLocal(iniciadaEm), iniciadaEm, terminadaEm: new Date(fim).toISOString(), ini, fim };
    });
  const registros: RegistroV2[] = [];
  const sessaoDe = (t: number) => {
    let s = sessoes.find(x => t >= x.ini - 5 * 60_000 && t <= x.fim + 10 * 60_000);
    if (!s) {
      // Registro sem sessão no v1: vira uma sessão daquele dia, junto com os outros registros do mesmo dia.
      const iso = new Date(t).toISOString(), dl = diaLocal(iso);
      s = sessoes.find(x => x.diaLocal === dl && x.id.startsWith("v1sem"));
      if (!s) { s = { id: "v1sem" + randomUUID().slice(5), dia: diaDaSemanaLocal(iso), indiceTreino: 0, diaLocal: dl, iniciadaEm: iso, terminadaEm: iso, ini: t, fim: t }; sessoes.push(s); }
      s.ini = Math.min(s.ini, t); s.fim = Math.max(s.fim, t);
      s.iniciadaEm = new Date(s.ini).toISOString(); s.terminadaEm = new Date(s.fim).toISOString();
    }
    return s;
  };

  let semReps = 0;
  for (const e of entradas.values()) {
    const t = Date.parse(txt(e.date)), s = sessaoDe(t), feitoEm = new Date(t).toISOString();
    const chave = chaveDoExercicio(ligar(e));
    const sets = arr(e.sets).map(obj);
    // Configuração: a do protocolo quando o formato bate (tipos e faixas), para a última vez ficar ligada; senão, a do próprio registro.
    const tipos = sets.map(x => { const t = txt(x.setType).toUpperCase(); return t === "REST_PAUSE" || t === "MUSCLE_ROUND" ? t : "NORMAL"; });
    const doProt = configDoProtocolo.get(chave);
    const bate = doProt && doProt.series.length === sets.length && doProt.series.every((z, j) => z.tipo === tipos[j]
      && (z.tipo !== "NORMAL" || !faixaDe(txt(sets[j]!.repRange)) || faixaDe(txt(sets[j]!.repRange))!.join("-") === z.faixa.join("-")));
    const config = bate ? doProt.config : configuracao(seriesDoV1(sets.map((x, j) => ({ type: tipos[j], repRange: x.repRange, ger: 8 }))));
    const base = { sessaoId: s.id, exercicioChave: chave, configuracao: config, feitoEm, reps: null, ger: null, b1: null, b2: null, blocos: null, ultimo: null };
    const kgDe = (x: J) => clamp(num(x.kg) ?? num(e.kg), 0, 1000);
    [...arr(e.warmups), ...arr(e.feeders)].map(obj).forEach((x, j) => {
      const kg = kgDe(x), reps = clamp(num(x.reps), 0, 200);
      if (kg == null || reps == null || j > 20) return;
      registros.push({ ...base, id: randomUUID(), passo: "preparo", ordem: j, tipo: null, kg: num(x.kg) ?? kg, reps });
    });
    sets.forEach((x, j) => {
      const kg = num(x.kg) ?? num(e.kg);
      if (kg == null || kg < 0 || kg > 1000 || j > 20) return;
      const blocos = arr(x.blocks).map(b => num(obj(b).reps) ?? 0);
      if (tipos[j] === "REST_PAUSE") { registros.push({ ...base, id: randomUUID(), passo: "valida", ordem: j, tipo: "REST_PAUSE", kg, b1: clamp(blocos[0] ?? 0, 0, 200), b2: clamp(blocos[1] ?? 0, 0, 200) }); return; }
      if (tipos[j] === "MUSCLE_ROUND") {
        // v1: até 12 blocos de 4; v2: até 6. Blocos completos antes da falha, e as repetições do bloco da falha (ou do sexto).
        const falhou = num(x.failedBlock);
        const completos = Math.min(6, falhou != null ? Math.max(0, Math.round(falhou) - 1) : blocos.filter(r => r >= 4).length);
        const ultimo = completos >= 6 ? (blocos[5] ?? 4) : (num(x.failedReps) ?? 0);
        registros.push({ ...base, id: randomUUID(), passo: "valida", ordem: j, tipo: "MUSCLE_ROUND", kg, blocos: completos, ultimo: clamp(ultimo, 0, 200) });
        return;
      }
      const reps = clamp(num(x.reps), 0, 200);
      if (reps == null) { semReps++; return; }
      registros.push({ ...base, id: randomUUID(), passo: "valida", ordem: j, tipo: "NORMAL", kg, reps });
    });
  }
  if (semReps) avisos.push(`${semReps} série(s) sem repetições (pulse ou registro incompleto) ficaram de fora do histórico.`);

  const final: SessaoV2[] = sessoes.map(s => {
    const id = s.id.startsWith("v1sem") ? randomUUID() : s.id;
    registros.forEach(r => { if (r.sessaoId === s.id) r.sessaoId = id; });
    return { id, dia: s.dia, indiceTreino: Math.max(0, diasDeTreino.indexOf(s.dia)), diaLocal: s.diaLocal, iniciadaEm: s.iniciadaEm, terminadaEm: s.terminadaEm };
  }).sort((a, b) => a.iniciadaEm.localeCompare(b.iniciadaEm));

  const nome = (c.nome ?? "").trim() || c.email.split("@")[0]!;
  return {
    conta: { id: c.id, email: c.email.trim().toLowerCase(), nome: nome.slice(0, 60), senhaHash: c.senhaHash, confirmadoEm: c.confirmadoEm, criadaEm: c.criadaEm },
    protocolo, sessoes: final, registros, novosItens: [...novosItens.values()], avisos
  };
}

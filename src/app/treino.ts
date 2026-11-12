// O treino em andamento: o estado da sessão (src/domain/sessao.ts), guardado no aparelho a cada passo para sobreviver
// a recarregar a página, e os registros de cada passo na fila de envio. Também guarda o resumo do treino que acabou.
import { create } from "zustand";
import { filaDepois } from "../domain/agenda.ts";
import { concluir, corrigir, iniciar, pularExercicio, type Aviso, type Dados, type EstadoDaSessao, type ResultadoDoPasso } from "../domain/sessao.ts";
import type { Passo } from "../domain/preparo.ts";
import { gravarChave, lerChave } from "../lib/idb.ts";
import { toast } from "../lib/aviso.ts";
import { fila } from "./estado.ts";
import { useProtocolo, type SessaoFeita } from "./protocolo.ts";

export interface Fim { s: EstadoDaSessao; cedo: boolean; terminadaEm: number; totalAntes: number }

interface Guardado { sessao: EstadoDaSessao | null; regs: Record<number, string>; fim: Fim | null }

interface Estado extends Guardado {
  restaurado: boolean;
  /* Passo à mostra no reel. */
  vista: number;
  flash: { tipo: "pickup" | "pain"; n: number } | null;
  restaurar(): Promise<void>;
  comecar(d: Dados): Promise<void>;
  concluirPasso(r: ResultadoDoPasso): Promise<void>;
  corrigirPasso(i: number, r: ResultadoDoPasso): Promise<void>;
  ajustarDescanso(seg: number): void;
  acabarDescanso(): void;
  ver(i: number): void;
  pular(): Promise<void>;
  encerrar(): Promise<void>;
  cancelar(): Promise<void>;
  fecharResumo(): void;
}

const copia = <T>(x: T): T => structuredClone(x);

function registro(s: EstadoDaSessao, i: number, id: string, substitui: string | null) {
  const p: Passo = s.passos[i]!, e = s.lista[p.k]!, r = s.res[i] as Record<string, number | undefined>;
  const base = {
    id, sessaoId: s.id, exercicioChave: e.chave, exercicioId: e.uid, configuracao: e.configuracao,
    ordem: p.tipo === "CALIBRACAO" ? 0 : p.j, kg: r.kg ?? s.wk[p.k]!.kg, substitui, feitoEm: new Date().toISOString(),
    reps: null as number | null, ger: null as number | null, b1: null as number | null, b2: null as number | null, blocos: null as number | null, ultimo: null as number | null
  };
  if (p.tipo === "CALIBRACAO") return { ...base, passo: "calibracao", tipo: null };
  if (p.tipo === "PREPARO") return { ...base, passo: "preparo", tipo: null, reps: r.reps ?? 0 };
  const z = p.serie;
  if (z.tipo === "NORMAL") return { ...base, passo: "valida", tipo: z.tipo, reps: r.reps ?? 0, ger: r.ger ?? z.ger };
  if (z.tipo === "REST_PAUSE") return { ...base, passo: "valida", tipo: z.tipo, b1: r.b1 ?? 0, b2: r.b2 ?? 0 };
  return { ...base, passo: "valida", tipo: z.tipo, blocos: r.blocos ?? 0, ultimo: r.ultimo ?? 0 };
}

const dadosDaSessao = (s: EstadoDaSessao, estado: string, terminadaEm: number | null) => ({
  id: s.id, protocoloId: s.protocoloId, protocoloVersao: s.protocoloVersao, dia: s.dia, indiceTreino: s.indiceTreino,
  diaLocal: s.diaLocal, iniciadaEm: new Date(s.inicio).toISOString(), terminadaEm: terminadaEm ? new Date(terminadaEm).toISOString() : null, estado
});

function mostrar(avisos: Aviso[], set: (p: Partial<Estado>) => void) {
  let n = 0;
  for (const a of avisos) {
    if (a.flash) set({ flash: { tipo: a.flash, n: Date.now() + n } });
    // Um aviso por vez, como no mock: o julgamento do exercício vem depois do recorde.
    if (a.titulo) setTimeout(() => toast(a.titulo, a.sub, a.face, a.bom), n);
    if (a.titulo) n += 1600;
  }
}

export const useTreino = create<Estado>((set, get) => {
  const guardar = () => { const { sessao, regs, fim } = get(); void gravarChave("treino", { sessao, regs, fim } satisfies Guardado).catch(() => {}); };

  async function terminar(cedo: boolean) {
    const s = get().sessao;
    if (!s) return;
    const agora = Date.now();
    s.descanso = null;
    await fila.acrescentar({ tipo: "sessao", id: s.id, dados: dadosDaSessao(s, cedo ? "encerrada" : "concluida", agora) });
    // A Hoje e o Progresso já contam esta sessão, mesmo sem rede.
    const P = useProtocolo.getState();
    const feita: SessaoFeita = { id: s.id, dia: s.dia, indiceTreino: s.indiceTreino, diaLocal: s.diaLocal, iniciadaEm: new Date(s.inicio).toISOString(), terminadaEm: new Date(agora).toISOString(), estado: cedo ? "encerrada" : "concluida" };
    const sessoes = [...P.sessoes, feita];
    const total = P.protocolo ? P.protocolo.dias.filter(d => !d.folga && d.exercicios.length).length : 0;
    const protocolo = P.protocolo ? { ...P.protocolo, fila: filaDepois(P.protocolo.agenda, s.indiceTreino, total, P.protocolo.fila ?? 0) } : null;
    useProtocolo.setState({ sessoes, protocolo });
    void gravarChave("sessoes", sessoes).catch(() => {});
    if (protocolo) void gravarChave("protocolo", protocolo).catch(() => {});
    // A última vez de cada exercício feito, para a próxima sugestão sair certa antes de a fila enviar.
    const ultimos = (await lerChave<Record<string, unknown>>("ultimos").catch(() => undefined)) ?? {};
    s.lista.forEach((e, k) => {
      const idx = s.passos.map((p, i) => p.k === k && s.res[i] ? i : -1).filter(i => i >= 0);
      if (!idx.some(i => s.passos[i]!.tipo === "TRABALHO")) return;
      ultimos[`${e.chave}|${e.configuracao}`] = { em: new Date(agora).toISOString(), registros: idx.map(i => registro(s, i, "", null)) };
    });
    void gravarChave("ultimos", ultimos).catch(() => {});
    set({ sessao: null, regs: {}, fim: { s, cedo, terminadaEm: agora, totalAntes: P.sessoes.length } });
    guardar();
    void fila.enviar();
  }

  return {
    sessao: null, regs: {}, fim: null, restaurado: false, vista: 0, flash: null,

    async restaurar() {
      if (get().restaurado) return;
      const g = await lerChave<Guardado>("treino").catch(() => undefined);
      set({ sessao: g?.sessao ?? null, regs: g?.regs ?? {}, fim: g?.fim ?? null, vista: g?.sessao?.i ?? 0, restaurado: true });
    },

    async comecar(d) {
      const s = iniciar(d);
      set({ sessao: s, regs: {}, fim: null, vista: 0 });
      guardar();
      await fila.acrescentar({ tipo: "sessao", id: s.id, dados: dadosDaSessao(s, "em_andamento", null) });
      void fila.enviar();
    },

    async concluirPasso(r) {
      const atual = get().sessao;
      if (!atual) return;
      const s = copia(atual), i = s.i;
      const c = concluir(s, r, Date.now());
      const id = crypto.randomUUID();
      const regs = { ...get().regs, [i]: id };
      await fila.acrescentar({ tipo: "registro", id, dados: registro(s, i, id, null) });
      mostrar(c.avisos, set);
      if (c.terminou) { set({ sessao: s, regs }); await terminar(false); return; }
      // Depois do julgamento do exercício, uma pausa curta para o aviso aparecer antes do próximo cartão.
      set({ sessao: s, regs, vista: s.i });
      guardar();
      void fila.enviar();
    },

    async corrigirPasso(i, r) {
      const atual = get().sessao;
      if (!atual) return;
      const s = copia(atual);
      const a = corrigir(s, i, r);
      const id = crypto.randomUUID();
      await fila.acrescentar({ tipo: "registro", id, dados: registro(s, i, id, get().regs[i] ?? null) });
      set({ sessao: s, regs: { ...get().regs, [i]: id } });
      toast(a.titulo, a.sub, a.face, a.bom);
      guardar();
    },

    ajustarDescanso(seg) {
      const s = get().sessao;
      if (!s?.descanso) return;
      const agora = Date.now(), resta = Math.max(0, Math.ceil((s.descanso.fim - agora) / 1000) + seg);
      set({ sessao: { ...s, descanso: { ...s.descanso, fim: agora + resta * 1000, dur: Math.max(s.descanso.dur, resta) } } });
      guardar();
    },

    acabarDescanso() {
      const s = get().sessao;
      if (!s) return;
      set({ sessao: { ...s, descanso: null }, vista: s.i });
      guardar();
    },

    ver(i) { const s = get().sessao; if (s && i >= 0 && i < s.passos.length) set({ vista: i }); },

    async pular() {
      const s = get().sessao;
      if (!s) return;
      const c = copia(s);
      if (pularExercicio(c)) { set({ sessao: c }); await terminar(false); return; }
      set({ sessao: c, vista: c.i });
      guardar();
    },

    encerrar: () => terminar(true),

    async cancelar() {
      const s = get().sessao;
      if (!s) return;
      const soAqui = await fila.descartar(s.id);
      if (!soAqui) await fila.acrescentar({ tipo: "sessao", id: s.id, dados: dadosDaSessao(s, "cancelada", Date.now()) });
      set({ sessao: null, regs: {}, fim: null, vista: 0 });
      guardar();
      void fila.enviar();
      toast("Treino cancelado", "Nada desta sessão foi salvo e ela não conta presença.", 8);
    },

    fecharResumo() { set({ fim: null }); guardar(); }
  };
});

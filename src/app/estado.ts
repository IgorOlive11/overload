// Estado global do app: a conta e a fila de envio. Sem rede, a conta sai do aparelho para o app abrir na academia.
import { create } from "zustand";
import { api, enviarLote, ErroDaApi, type Conta } from "../lib/api.ts";
import { Fila, ArmazemEmMemoria, type Estado as EstadoDaFila } from "../lib/fila.ts";
import { armazemIdb, gravarChave, lerChave, limparTudo } from "../lib/idb.ts";

export const fila = new Fila(typeof indexedDB === "undefined" ? new ArmazemEmMemoria() : armazemIdb, enviarLote);

interface Estado {
  conta: Conta | null;
  /* Ainda não sabe se há conta (primeira leitura). */
  carregando: boolean;
  semRede: boolean;
  fila: EstadoDaFila;
  carregar(): Promise<void>;
  entrou(conta: Conta): Promise<void>;
  sair(): Promise<void>;
}

export const useApp = create<Estado>(set => ({
  conta: null,
  carregando: true,
  semRede: typeof navigator !== "undefined" && !navigator.onLine,
  fila: fila.atual,

  async carregar() {
    try {
      const { conta } = await api<{ conta: Conta }>("GET", "/conta");
      await gravarChave("conta", conta);
      set({ conta, carregando: false, semRede: false });
      void fila.enviar();
    } catch (e) {
      if (e instanceof ErroDaApi && e.status === 401) {
        set({ conta: null, carregando: false });
        return;
      }
      // Sem rede: usa a conta guardada no aparelho.
      set({ conta: (await lerChave<Conta>("conta").catch(() => undefined)) ?? null, carregando: false, semRede: true });
    }
  },

  async entrou(conta) {
    await gravarChave("conta", conta);
    set({ conta, semRede: false });
    void fila.enviar();
  },

  async sair() {
    await api("DELETE", "/sessao").catch(() => {});
    await limparTudo().catch(() => {});
    set({ conta: null });
  }
}));

fila.ouvir(f => useApp.setState({ fila: f }));

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { useApp.setState({ semRede: false }); void fila.enviar(); });
  window.addEventListener("offline", () => useApp.setState({ semRede: true }));
  // Tenta de novo de tempos em tempos e quando o app volta para a frente.
  setInterval(() => { if (navigator.onLine && fila.atual.pendentes) void fila.enviar(); }, 60_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void fila.enviar(); });
}

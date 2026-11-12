// Protocolo e sessões da conta: lidos da API e guardados no aparelho para o app abrir sem internet.
import { create } from "zustand";
import { api, ErroDaApi } from "../lib/api.ts";
import { gravarChave, lerChave } from "../lib/idb.ts";
import { bibDaApi, daApi, paraApi, type Item, type ProtocoloDaApi, type Rascunho } from "../lib/plano.ts";

export interface SessaoFeita { id: string; dia: number; indiceTreino: number; diaLocal: string; iniciadaEm: string; terminadaEm: string; estado: "concluida" | "encerrada" }

interface Estado {
  protocolo: ProtocoloDaApi | null;
  sessoes: SessaoFeita[];
  carregado: boolean;
  /* Itens da biblioteca já vistos (do protocolo e das buscas), por id. */
  bib: Record<string, Item>;
  carregar(): Promise<void>;
  salvar(r: Rascunho): Promise<ProtocoloDaApi>;
  lembrar(itens: Record<string, Item>): void;
}

export const useProtocolo = create<Estado>((set, get) => ({
  protocolo: null,
  sessoes: [],
  carregado: false,
  bib: {},

  async carregar() {
    try {
      const [{ protocolo }, { sessoes }] = await Promise.all([
        api<{ protocolo: ProtocoloDaApi | null }>("GET", "/protocolo"),
        api<{ sessoes: SessaoFeita[] }>("GET", "/sessoes")
      ]);
      await gravarChave("protocolo", protocolo);
      await gravarChave("sessoes", sessoes);
      set({ protocolo, sessoes, carregado: true, bib: { ...get().bib, ...(protocolo ? bibDaApi(protocolo) : {}) } });
    } catch (e) {
      if (e instanceof ErroDaApi && e.status === 401) throw e;
      // Sem rede: o que ficou no aparelho.
      const protocolo = (await lerChave<ProtocoloDaApi | null>("protocolo").catch(() => null)) ?? null;
      const sessoes = (await lerChave<SessaoFeita[]>("sessoes").catch(() => [])) ?? [];
      set({ protocolo, sessoes, carregado: true, bib: { ...get().bib, ...(protocolo ? bibDaApi(protocolo) : {}) } });
    }
  },

  async salvar(r) {
    const atual = get().protocolo;
    try {
      const { protocolo } = await api<{ protocolo: ProtocoloDaApi }>("PUT", "/protocolo", paraApi(r, atual?.versao ?? null));
      await gravarChave("protocolo", protocolo);
      set({ protocolo, bib: { ...get().bib, ...bibDaApi(protocolo) } });
      return protocolo;
    } catch (e) {
      if (e instanceof ErroDaApi && e.status === 409) {
        const outro = e.corpo.protocolo as ProtocoloDaApi;
        set({ protocolo: outro });
        throw new Error("O plano mudou em outro aparelho. Abri a versão de lá; refaça a mudança se ainda quiser.", { cause: e });
      }
      throw e;
    }
  },

  lembrar(itens) { set({ bib: { ...get().bib, ...itens } }); }
}));

export const rascunhoDoProtocolo = (p: ProtocoloDaApi) => daApi(p);

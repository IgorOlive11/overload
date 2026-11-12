// O Doomguy guia (design/mock/guia.js): o tour depois do cadastro e as dicas de primeira vez, uma vez por conta.
// O que já foi visto fica no aparelho; a tela só volta a responder depois do "Entendi".
import { create } from "zustand";
import { gravarChave, lerChave } from "../lib/idb.ts";

export interface PassoDoGuia {
  /* Seletor do elemento em destaque. Sem alvo, o balão fica solto (embaixo, ou em cima com pos "top"). */
  alvo?: string;
  face?: number;
  texto: string;
  /* Escala de faces abaixo do texto (GER 7 a 10). */
  faces?: number[];
  botao?: string;
  pos?: "top" | "bottom";
  /* Rola até o alvo (padrão: sim). */
  revelar?: boolean;
}

interface Estado {
  passos: PassoDoGuia[] | null;
  i: number;
  vistos: Record<string, true>;
  carregado: boolean;
  fim: (() => void) | null;
  carregar(): Promise<void>;
  tour(chave: string, passos: PassoDoGuia[], fim?: () => void): void;
  dica(chave: string, passo: PassoDoGuia, fim?: () => void): void;
  proximo(): void;
  pular(): void;
}

export const useGuia = create<Estado>((set, get) => {
  const marcar = (chave: string) => {
    const vistos = { ...get().vistos, [chave]: true as const };
    set({ vistos });
    void gravarChave("guia", vistos).catch(() => {});
  };
  const fechar = () => { const f = get().fim; set({ passos: null, i: 0, fim: null }); f?.(); };
  return {
    passos: null, i: 0, vistos: {}, carregado: false, fim: null,
    async carregar() {
      if (get().carregado) return;
      const vistos = (await lerChave<Record<string, true>>("guia").catch(() => undefined)) ?? {};
      set({ vistos: { ...vistos, ...get().vistos }, carregado: true });
    },
    tour(chave, passos, fim) {
      if (!get().carregado || get().vistos[chave] || get().passos) return;
      marcar(chave);
      set({ passos, i: 0, fim: fim ?? null });
    },
    dica(chave, passo, fim) { get().tour(chave, [passo], fim); },
    proximo() {
      const { passos, i } = get();
      if (!passos) return;
      if (i >= passos.length - 1) fechar(); else set({ i: i + 1 });
    },
    pular: fechar
  };
});

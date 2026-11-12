// toast(título, texto, face, bom) do mock: some sozinho depois de alguns segundos. O componente Toast desenha.
import { create } from "zustand";

interface Aviso { titulo: string; sub: string; face: number; bom: boolean; id: number }
export const useAviso = create<{ aviso: Aviso | null }>(() => ({ aviso: null }));
let ultimo = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(titulo: string, sub: string, face = 10, bom = false): void {
  clearTimeout(timer);
  useAviso.setState({ aviso: { titulo, sub, face, bom, id: ++ultimo } });
  timer = setTimeout(() => useAviso.setState({ aviso: null }), 3800);
}

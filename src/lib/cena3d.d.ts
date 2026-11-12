import type { Equipamento } from "../domain/tipos.ts";
export function mostrar3D(palco: HTMLElement, eq: Equipamento, kg: number, animar: boolean, pilha: number): Promise<void>;
export function pararRender(): void;

// Palco do 3D (.stage do mock) com a carga por cima: o canvas único da cena vem para cá quando o palco aparece.
import { useEffect, useRef, type ReactNode } from "react";
import { mostrar3D } from "../lib/cena3d.js";
import type { Equipamento } from "../domain/tipos.ts";

export function Palco({ eq, kg, pilha, animar = false, children }: { eq: Equipamento; kg: number; pilha?: number | null; animar?: boolean; children?: ReactNode }) {
  const palco = useRef<HTMLDivElement>(null);
  useEffect(() => { if (palco.current) void mostrar3D(palco.current, eq, kg, animar, pilha ?? 100); }, [eq, kg, pilha, animar]);
  return <div className="stage" ref={palco}>{children}</div>;
}

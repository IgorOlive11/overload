// Relógio da tela de treino e o tempo que falta do descanso.
import { useEffect, useState } from "react";
import type { EstadoDaSessao } from "../../domain/sessao.ts";

/* Relógio que anda a cada segundo. */
export function useAgora(ms = 1000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return agora;
}

export function tempoDoDescanso(d: NonNullable<EstadoDaSessao["descanso"]>, agora: number) {
  const resta = Math.max(0, Math.ceil((d.fim - agora) / 1000)), pronto = resta <= 0;
  const pct = d.dur ? resta / d.dur : 0;
  const cor = pronto ? "var(--ok)" : pct > .5 ? "var(--ok)" : pct > .2 ? "var(--warn)" : "var(--accent)";
  return { resta, pronto, pct, cor, texto: pronto ? "Pronto" : Math.floor(resta / 60) + ":" + String(resta % 60).padStart(2, "0") };
}

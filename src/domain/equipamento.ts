// Carga por equipamento: base, passo de arredondamento, incremento da progressão e carga inicial da pergunta de carga.
import type { Equipamento } from "./tipos.ts";

export interface DadosDoEquipamento { nome: string; base: number; passo: number; incremento: number; cargaInicial: number; porMao: boolean; descricao: string }

export const EQUIPAMENTOS: Readonly<Record<Equipamento, DadosDoEquipamento>> = {
  barra: { nome: "Barra", base: 20, passo: 2.5, incremento: 5, cargaInicial: 40, porMao: false, descricao: "barra olímpica de 20 kg com anilhas, arredonda em 2,5 kg" },
  smith: { nome: "Smith", base: 15, passo: 2.5, incremento: 2.5, cargaInicial: 30, porMao: false, descricao: "barra do Smith de 15 kg com anilhas, arredonda em 2,5 kg" },
  carregada: { nome: "Máquina de anilhas", base: 0, passo: 5, incremento: 5, cargaInicial: 40, porMao: false, descricao: "máquina carregada com anilhas nos dois lados, arredonda em 5 kg" },
  pilha: { nome: "Máquina de placas", base: 0, passo: 2.5, incremento: 2.5, cargaInicial: 30, porMao: false, descricao: "pilha de placas de 5 kg com meia placa de 2,5 kg; acima da pilha, anilhas no gympin. Polias usam o mesmo modelo" },
  halteres: { nome: "Halteres", base: 0, passo: 2, incremento: 2, cargaInicial: 10, porMao: true, descricao: "par de halteres, carga por mão, de 2 em 2 kg" }
};

export const unidade = (eq: Equipamento) => EQUIPAMENTOS[eq].porMao ? "kg cada" : "kg";

/* Arredonda para o que dá para montar no equipamento, nunca abaixo da barra vazia (ou de um passo, sem barra). */
export function arredondar(kg: number, eq: Equipamento): number {
  const E = EQUIPAMENTOS[eq];
  const v = E.base + Math.round(Math.max(0, kg - E.base) / E.passo) * E.passo;
  return Math.max(E.base || E.passo, Math.round(v * 100) / 100);
}

/* Salto grande: o próximo incremento passa de 10% da carga (teto da ACSM). Aí a carga só sobe com uma repetição além do topo. */
export const saltoGrande = (kg: number, eq: Equipamento) => kg > 0 && EQUIPAMENTOS[eq].incremento / kg > 0.1;

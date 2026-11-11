// Progressão de carga: julgar a última sessão, sugerir a carga de hoje e montar o cartão de sugestão ou a pergunta de carga.
import type { Equipamento, Registro, Resultado, Serie } from "./tipos.ts";
import { EQUIPAMENTOS, arredondar, saltoGrande, unidade } from "./equipamento.ts";
import { nivel } from "./ger.ts";
import { faixaTxt, fmt, juntar } from "./texto.ts";

type Normal = Extract<Serie, { tipo: "NORMAL" }>;
const reps = (r: Resultado) => ("reps" in r ? r : { reps: 0, ger: undefined });
const rp = (r: Resultado) => ("b1" in r ? r : { b1: 0, b2: 0 });
const mr = (r: Resultado) => ("blocos" in r ? r : { blocos: 0, ultimo: 0 });

export interface Julgamento { ok: boolean; abaixo?: boolean; saltoGrande?: boolean; texto: string }

/* Uma série bateu a regra? Normal: chegou ao topo da faixa (mais 1 no salto grande) sem passar do GER alvo.
   Rest-pause: 10 no bloco 1. Muscle round: os 6 blocos completos e mais de 4 no sexto. */
export function julgar(serie: Serie, r: Resultado | undefined, kg: number, eq: Equipamento): Julgamento {
  if (!r) return { ok: false, texto: "série não feita" };
  if (serie.tipo === "NORMAL") {
    const n = reps(r), grande = saltoGrande(kg, eq), precisa = serie.faixa[1] + (grande ? 1 : 0);
    const g = n.ger ?? serie.ger, topo = n.reps >= precisa, esforco = g <= serie.ger;
    return {
      ok: topo && esforco, abaixo: n.reps < serie.faixa[0], saltoGrande: grande,
      texto: `${n.reps} repetições, ${nivel(g).sobrou}, numa série de ${faixaTxt(serie.faixa)} com ${nivel(serie.ger).alvo.toLowerCase()}`
        + (topo && !esforco ? " (chegou ao topo, mas com menos reserva que o combinado)" : "")
        + (grande && n.reps === serie.faixa[1] ? ` (o próximo salto passa de 10% da carga, então sobe com ${precisa})` : "")
    };
  }
  if (serie.tipo === "REST_PAUSE") {
    const b = rp(r);
    return { ok: b.b1 >= 10, texto: `rest-pause com ${b.b1} repetições no bloco 1 e ${b.b2} no bloco 2 (sobe com 10 no bloco 1)` };
  }
  const m = mr(r);
  return { ok: m.blocos >= 6 && m.ultimo > 4, texto: m.blocos >= 6 ? `muscle round completo com ${m.ultimo} repetições no sexto bloco (sobe com mais de 4)` : `muscle round com falha no bloco ${m.blocos + 1} de 6` };
}

export interface Sugestao { kg: number | null; sobe: boolean; abaixo?: boolean; curto: string; porque: string }

/* A carga de hoje pela última sessão: sobe o incremento do equipamento quando todas as séries bateram a regra. */
export function sugestao(series: readonly Serie[], ultimo: Registro | null, eq: Equipamento): Sugestao {
  if (!ultimo) return { kg: null, sobe: false, curto: "Sem histórico", porque: "Primeira vez neste formato. Responda a pergunta da calibração; a carga vira a referência." };
  const inc = EQUIPAMENTOS[eq].incremento;
  const js = series.map((s, i) => julgar(s, ultimo.resultados.at(i), ultimo.kg, eq));
  const ultimoTxt = `Na última sessão, com ${fmt(ultimo.kg)} ${unidade(eq)}: ${js.map(j => j.texto).join("; ")}.`;
  if (js.every(j => j.ok)) return { kg: ultimo.kg + inc, sobe: true, curto: `Sobe ${fmt(inc)} kg`, porque: ultimoTxt + ` Bateu a regra em todas as séries, então hoje sobe ${fmt(inc)} kg.` };
  if (js.some(j => j.abaixo)) return { kg: ultimo.kg, sobe: false, abaixo: true, curto: "Abaixo da faixa", porque: ultimoTxt + " Ficou abaixo do mínimo da faixa. A sugestão mantém a carga; se repetir, considere reduzir." };
  return { kg: ultimo.kg, sobe: false, curto: "Mantém", porque: ultimoTxt + " Ainda falta bater a regra em todas as séries, então a carga se mantém." };
}

export function feitoTxt(series: readonly Serie[], res: readonly Resultado[]): string {
  if (series.every(s => s.tipo === "NORMAL")) return juntar(res.map(r => String(reps(r).reps))) + (res.length === 1 && reps(res[0]).reps === 1 ? " repetição" : " repetições");
  return juntar(series.map((s, j) => {
    const r = res[j];
    if (s.tipo === "NORMAL") return `${reps(r).reps} repetições na série ${j + 1}`;
    if (s.tipo === "REST_PAUSE") return `${rp(r).b1} repetições no bloco 1 do rest-pause`;
    const m = mr(r);
    return m.blocos >= 6 ? `os 6 blocos do muscle round com ${m.ultimo} repetições no sexto` : `o muscle round até falhar no bloco ${m.blocos + 1}`;
  }));
}

export interface Meta { reps?: number; b1?: number; ultimo?: number; faixa?: true; esforco?: true; texto: string }

/* A meta de hoje para uma série, pela última vez e se a carga subiu. */
export function meta(serie: Serie, r: Resultado, sobe: boolean, grande: boolean): Meta {
  if (serie.tipo === "NORMAL") {
    const n = reps(r).reps, f = serie.faixa;
    if (sobe) return { reps: f[1], faixa: true, texto: `${faixaTxt(f)} repetições` };
    if (grande && n === f[1]) return { reps: f[1] + 1, texto: `${f[1] + 1} repetições, uma além do topo, porque o próximo salto de carga passa de 10%` };
    if (n >= f[1]) return { reps: f[1], texto: `${f[1]} repetições de novo, deixando ${nivel(serie.ger).alvo.toLowerCase()}`, esforco: true };
    const alvo = Math.max(f[0], n + 1);
    return { reps: alvo, texto: `${alvo} repetições` };
  }
  if (serie.tipo === "REST_PAUSE") {
    const b1 = Math.min(10, rp(r).b1 + 1);
    return sobe ? { texto: "cerca de 8 repetições no bloco 1" } : { b1, texto: `${b1} repetições no bloco 1` };
  }
  if (sobe) return { texto: "os 6 blocos de 4" };
  const m = mr(r);
  if (m.blocos >= 6) { const u = Math.max(5, m.ultimo + 1); return { ultimo: u, texto: `${u} repetições no sexto bloco` }; }
  return { texto: `passar do bloco ${m.blocos + 1}` };
}

export function metaTxt(series: readonly Serie[], metas: readonly Meta[]): string {
  if (series.every(s => s.tipo === "NORMAL")) {
    const ns = series as readonly Normal[];
    if (metas.every(t => t.faixa) && ns.every(s => s.faixa[0] === ns[0].faixa[0] && s.faixa[1] === ns[0].faixa[1])) return `${faixaTxt(ns[0].faixa)} repetições ${series.length > 1 ? "em cada série" : ""}`.trim();
    if (metas.every(t => !t.faixa && !t.esforco)) return metas.length > 1 && metas.every(t => t.reps === metas[0].reps) ? `${metas[0].reps} repetições em cada série` : juntar(metas.map(t => String(t.reps))) + " repetições";
  }
  return juntar(metas.map((t, j) => series.length > 1 && series[j].tipo === "NORMAL" ? `${t.texto} na série ${j + 1}` : t.texto));
}

export type ModoDoCartao = "pergunta" | "up" | "hold" | "under" | "back";
export interface Cartao { modo: ModoDoCartao; kg: number; sugestao: Sugestao; metas: Meta[]; titulo?: string; texto?: string; face?: number }

/* O cartão da calibração. Sem histórico: pergunta de carga, com a carga inicial do equipamento.
   Com histórico: sugestão. De 15 a 27 dias parado, mesma carga e meta no começo da faixa; de 28 em diante, 10% mais leve. */
export function cartao(series: readonly Serie[], ultimo: Registro | null, eq: Equipamento, diasParado: number): Cartao {
  const s = sugestao(series, ultimo, eq), u = unidade(eq);
  if (!ultimo) return { modo: "pergunta", kg: EQUIPAMENTOS[eq].cargaInicial, sugestao: s, metas: [] };
  const volta = diasParado >= 15, corte = diasParado >= 28, sobe = s.sobe && !volta;
  const kg = volta ? (corte ? arredondar(ultimo.kg * 0.9, eq) : ultimo.kg) : (s.kg ?? ultimo.kg);
  const grande = saltoGrande(ultimo.kg, eq);
  const metas = series.map((serie, j): Meta => volta && serie.tipo === "NORMAL" ? { reps: serie.faixa[0], texto: `${serie.faixa[0]} repetições` } : meta(serie, ultimo.resultados[j], sobe, grande));
  const feito = feitoTxt(series, ultimo.resultados), mt = metaTxt(series, metas), antes = `${fmt(ultimo.kg)} ${u}`;
  const modo: ModoDoCartao = volta ? "back" : sobe ? "up" : s.abaixo ? "under" : "hold";
  const titulo = { up: "Você superou seus limites", hold: "Mais uma hoje", under: "Abaixo da faixa", back: "De volta do inferno" }[modo];
  const texto = {
    up: `No último treino você fez ${feito} com ${antes}. Hoje, tente ${mt} com ${fmt(kg)} ${u}.`,
    hold: `Você fez ${feito} da última vez nesse exercício, com ${antes}. Tente fazer ${mt} com a mesma carga hoje.`,
    under: `Você fez ${feito} da última vez, com ${antes}, abaixo do mínimo da faixa. Mantenha a carga e busque ${mt}. Se repetir, ajuste a carga para baixo.`,
    back: corte ? `Faz ${diasParado} dias desde o último treino, quando você fez ${feito} com ${antes}. Depois de quatro semanas parado a força começa a cair, então hoje a carga vem 10% mais leve, ${fmt(kg)} ${u}. Tente ${mt}.`
      : `Faz ${diasParado} dias desde o último treino, quando você fez ${feito} com ${antes}. A força se mantém nesse intervalo, então a carga continua a mesma. Hoje, mire em ${mt} e deixe folga na reserva.`
  }[modo];
  return { modo, kg, sugestao: s, metas, titulo, texto, face: { up: 13, hold: 10, under: 8, back: 7 }[modo] };
}

/* A pergunta de carga da primeira vez, pela primeira série do exercício. */
export function perguntaDeCarga(serie: Serie): string {
  if (serie.tipo === "NORMAL") {
    if (serie.ger <= 9) return `Com que peso você faz ${faixaTxt(serie.faixa)} repetições deixando ${nivel(serie.ger).alvo}?`;
    if (serie.ger === 10) return `Com que peso você faz ${faixaTxt(serie.faixa)} repetições indo até a falha com a técnica perfeita?`;
    return `Com que peso você faria ${serie.faixa[1]} repetições indo além da falha?`;
  }
  if (serie.tipo === "REST_PAUSE") return "Com que peso você faria cerca de 8 repetições chegando perto da falha total?";
  return "Com que peso você normalmente falharia entre 10 e 12 repetições?";
}

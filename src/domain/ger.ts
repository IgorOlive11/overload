// Escala de esforço (GER 7 a 13): título da Doom face, alvo em repetições na reserva e o texto do que sobrou.
export interface NivelGer { titulo: string; reserva: string; sobrou: string; alvo: string }

export const GER: Readonly<Record<number, NivelGer>> = {
  7: { titulo: "Posso brincar papaizão", reserva: "4 a 6 repetições na reserva", sobrou: "sobraram 4 a 6", alvo: "4 a 6 na reserva" },
  8: { titulo: "Não quero me machucar", reserva: "2 a 3 repetições na reserva", sobrou: "sobraram 2 a 3", alvo: "2 a 3 na reserva" },
  9: { titulo: "Eu sou muito novo pra morrer", reserva: "1 repetição na reserva", sobrou: "sobrou 1", alvo: "1 na reserva" },
  10: { titulo: "Quebrei minha linha", reserva: "falha com a técnica perfeita", sobrou: "falha com técnica perfeita", alvo: "Até a falha, com técnica perfeita" },
  11: { titulo: "Sadomasoquista", reserva: "falha após perder a forma", sobrou: "falha perdendo a forma", alvo: "Até a falha, perdendo a forma" },
  12: { titulo: "Violência gratuita", reserva: "além da falha com ajuda ou técnicas", sobrou: "além da falha com ajuda", alvo: "Além da falha, com ajuda ou técnicas" },
  13: { titulo: "Eu sou reincarnação do Lucifer", reserva: "além da falha extrema", sobrou: "muito além da falha", alvo: "Muito além da falha" }
};

export function nivel(ger: number): NivelGer {
  const n = GER[ger];
  if (!n) throw new RangeError(`GER fora da escala 7 a 13: ${ger}`);
  return n;
}

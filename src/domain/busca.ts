// Busca na biblioteca com tradução de termos de academia do português para o inglês, como na v1:
// a biblioteca veio do ExerciseDB, com os nomes em inglês. Cada palavra da busca precisa aparecer, em português ou em inglês.

const TERMOS: Record<string, readonly string[]> = {
  supino: ["bench press", "chest press"], agachamento: ["squat"], terra: ["deadlift"], levantamento: ["deadlift", "lift"],
  remada: ["row"], puxada: ["pulldown", "pull-down", "pull down"], rosca: ["curl"], triceps: ["triceps", "pushdown", "extension"],
  biceps: ["biceps", "curl"], desenvolvimento: ["shoulder press", "overhead press", "military press"], elevacao: ["raise"],
  lateral: ["lateral", "side"], frontal: ["front"], crucifixo: ["fly", "flye"], voador: ["fly", "pec deck"], panturrilha: ["calf"],
  extensora: ["leg extension"], flexora: ["leg curl"], stiff: ["stiff", "romanian deadlift"], afundo: ["lunge", "split squat"],
  passada: ["lunge"], abdominal: ["crunch", "sit-up", "abs"], prancha: ["plank"], fixa: ["pull-up", "chin-up"], paralela: ["dip"],
  mergulho: ["dip"], encolhimento: ["shrug"], pulley: ["pushdown", "cable"], corda: ["rope"], halter: ["dumbbell"], halteres: ["dumbbell"],
  barra: ["barbell", "bar"], maquina: ["lever", "machine"], polia: ["cable"], cabo: ["cable"], inclinado: ["incline"], inclinada: ["incline"],
  declinado: ["decline"], sentado: ["seated", "sitting"], sentada: ["seated", "sitting"], pe: ["standing"], deitado: ["lying"],
  posterior: ["rear", "hamstring", "leg curl"], adutora: ["adduction", "adductor"], abdutora: ["abduction", "abductor"], gluteo: ["glute", "hip"],
  pelvica: ["hip thrust", "glute bridge"], quadril: ["hip"], ombro: ["shoulder"], peito: ["chest"], costas: ["back"], perna: ["leg"],
  unilateral: ["single", "one arm", "one leg"], martelo: ["hammer"], scott: ["preacher"], aberta: ["wide"], fechada: ["close", "narrow"],
  pegada: ["grip"], invertida: ["reverse"], reversa: ["reverse"], francesa: ["skull", "overhead"], testa: ["skull crusher", "lying triceps"]
};
const LIGACAO = new Set(["de", "da", "do", "das", "dos", "com", "na", "no", "em", "e", "a", "o"]);

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Cada palavra da busca com as traduções dela; palavras de ligação ficam de fora. */
export function termosDeBusca(q: string): string[][] {
  return semAcento(q).split(/[^a-z0-9-]+/).filter(p => p && !LIGACAO.has(p)).slice(0, 6).map(p => [p, ...(TERMOS[p] ?? [])]);
}

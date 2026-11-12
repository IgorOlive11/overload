// Doom faces do mock (design/assets/faces), uma por nível de GER, de 7 a 13.
const arquivos = import.meta.glob<string>("../../design/assets/faces/doom-face-*.png", { eager: true, query: "?url", import: "default" });

export const FACE: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(arquivos).map(([caminho, url]) => [Number(/doom-face-(\d+)\.png$/.exec(caminho)![1]), url])
);

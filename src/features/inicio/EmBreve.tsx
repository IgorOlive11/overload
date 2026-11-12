// Lugar das telas do bloco 2 (Hoje, Plano, Treino e Progresso) enquanto o shell é testado.
export function EmBreve({ tela }: { tela: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-4xl uppercase text-accent">{tela}</h1>
      <p className="text-muted">Esta tela chega no bloco 2. O shell, a conta e a fila já funcionam, também sem internet.</p>
    </section>
  );
}

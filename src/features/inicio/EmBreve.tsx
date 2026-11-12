// Lugar das telas do bloco 2 (Hoje, Treino, Progresso e Plano), no estilo dos cartões vazios do mock.
import { FACE } from "../../lib/faces.ts";

export function EmBreve({ tela }: { tela: string }) {
  return (
    <>
      <div className="card empty">
        <img className="face" src={FACE[9]} width={48} height={74} alt="" />
        <h3>{tela}</h3>
        <p>Esta tela chega na próxima etapa. A conta e o envio dos treinos já funcionam, também sem internet.</p>
      </div>
    </>
  );
}

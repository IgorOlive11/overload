// Lugar das telas do bloco 2 (Hoje, Treino, Progresso e Plano), no estilo dos cartões vazios do mock.
import { useApp } from "../../app/estado.ts";
import { FACE } from "../../lib/faces.ts";

export function EmBreve({ tela }: { tela: string }) {
  const { conta, sair, fila } = useApp();
  const sairComCuidado = async () => {
    if (fila.pendentes && !confirm(`Ainda há ${fila.pendentes} registro(s) sem enviar. Sair agora apaga esses registros do aparelho. Sair mesmo assim?`)) return;
    await sair();
  };
  return (
    <>
      <div className="card empty">
        <img className="face" src={FACE[9]} width={48} height={74} alt="" />
        <h3>{tela}</h3>
        <p>Esta tela chega na próxima etapa. A conta e o envio dos treinos já funcionam, também sem internet.</p>
      </div>
      {/* O mock não mostra onde fica o Sair; até a decisão, ele fica no Plano. */}
      {tela === "Plano" && <button className="linkbtn" onClick={() => void sairComCuidado()}>Sair da conta ({conta?.nome})</button>}
    </>
  );
}

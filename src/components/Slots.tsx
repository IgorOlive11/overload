// Keycards da semana (design/mock/hoje.js: renderSlots): uma por sessão da meta, mais a vaga de bônus.
import { Pix } from "./pix.tsx";

export function Slots({ feitos, meta }: { feitos: number; meta: number }) {
  const bonus = feitos > meta;
  return (
    <div className="slots">
      {Array.from({ length: meta }, (_, i) => (
        <div key={i} className={`slot ${i < feitos ? "done" : ""}`} aria-label={i < feitos ? "Sessão feita" : "Sessão pendente"}>{i < feitos ? <Pix nome="check" w={20} /> : i + 1}</div>
      ))}
      <div className={`slot bonus ${bonus ? "done" : ""}`} aria-label="Bônus">{bonus ? <Pix nome="check" w={20} /> : <Pix nome="skey" w={14} />}</div>
      <div className="week-count num">{Math.min(feitos, meta)}<small> de {meta}</small></div>
    </div>
  );
}

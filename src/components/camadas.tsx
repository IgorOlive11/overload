// Gaveta (.sheet) e aviso (.toast) do mock (design/mock/sessao.js: sheetIn e toast), como componentes.
import { useEffect, type ReactNode } from "react";
import { FACE } from "../lib/faces.ts";
import { useAviso } from "../lib/aviso.ts";
import { Pix } from "./pix.tsx";

export function Gaveta({ titulo, aberta, fechar, children }: { titulo: string; aberta: boolean; fechar(): void; children: ReactNode }) {
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, fechar]);
  if (!aberta) return null;
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="panel" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="phd">
          <h3>{titulo}</h3>
          <button className="infobtn" aria-label="Fechar" style={{ width: 44, height: 44 }} onClick={fechar} autoFocus>
            <Pix nome="x" w={16} />
          </button>
        </div>
        <div className="col" style={{ gap: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export function Toast() {
  const aviso = useAviso(s => s.aviso);
  if (!aviso) return null;
  return (
    <div className={`toast${aviso.bom ? " good" : ""}`} role="status" key={aviso.id}>
      <img className="face" alt="" width={28} height={43} src={FACE[aviso.face]} />
      <div><b>{aviso.titulo}</b><span>{aviso.sub}</span></div>
    </div>
  );
}


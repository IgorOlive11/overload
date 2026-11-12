// Faixa no topo do app com o estado da fila de envio. Falha não fica só no console (regra do MVP).
import { useApp, fila } from "../app/estado.ts";

export function AvisoDaFila() {
  const { fila: f, semRede } = useApp();
  if (f.recusas.length) return (
    <div role="alert" className="mx-4 mt-3 rounded border border-accent bg-accent-dim/30 p-3 text-base">
      {f.recusas.length} registro(s) não foram aceitos pelo servidor e ficaram de fora do histórico.
      <button className="link ml-2" onClick={() => fila.dispensarRecusas()}>Entendi</button>
    </div>
  );
  if (f.falha && f.pendentes) return (
    <div role="status" className="mx-4 mt-3 rounded border border-warn p-3 text-base text-warn">
      {f.falha} ({f.pendentes} pendente{f.pendentes > 1 ? "s" : ""})
      <button className="link ml-2" onClick={() => void fila.enviar()}>Tentar agora</button>
    </div>
  );
  if (semRede) return <div role="status" className="mx-4 mt-3 text-base text-muted">Sem internet. Tudo continua salvo no aparelho.</div>;
  if (f.pendentes) return <div role="status" className="mx-4 mt-3 text-base text-muted">Enviando {f.pendentes} registro(s)...</div>;
  return null;
}

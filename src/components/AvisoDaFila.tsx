// Faixa do estado da fila de envio. Falha não fica só no console (regra do MVP).
import { useApp, fila } from "../app/estado.ts";

export function AvisoDaFila() {
  const { fila: f, semRede } = useApp();
  if (f.recusas.length) return (
    <p role="alert" className="sync erro">
      {f.recusas.length} registro(s) não foram aceitos pelo servidor e ficaram de fora do histórico.
      <button onClick={() => fila.dispensarRecusas()}>Entendi</button>
    </p>
  );
  if (f.falha && f.pendentes) return (
    <p role="status" className="sync">
      {f.falha} ({f.pendentes} pendente{f.pendentes > 1 ? "s" : ""})
      <button onClick={() => void fila.enviar()}>Tentar agora</button>
    </p>
  );
  if (semRede) return <p role="status" className="sync">Sem internet. Tudo continua salvo no aparelho.</p>;
  return null;
}

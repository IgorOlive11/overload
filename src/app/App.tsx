// Casca do app com a marcação do mock (design/mock/estrutura.html): .shell > .app > .screens e as quatro abas.
// As telas Hoje, Treino, Progresso e Plano chegam no bloco 2.
import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Cadastro, Confirmar, Entrar, Esqueci, Redefinir } from "../features/conta/telas.tsx";
import { EmBreve } from "../features/inicio/EmBreve.tsx";
import { Clarao, RodapeDoDescanso, Treino } from "../features/treino/Treino.tsx";
import { useTreino } from "./treino.ts";
import { Plano } from "../features/plano/Plano.tsx";
import { Hoje } from "../features/hoje/Hoje.tsx";
import { Dicas } from "../components/Dicas.tsx";
import { fogo, facesVivas } from "../lib/efeitos.ts";
import { Toast } from "../components/camadas.tsx";
import { Pix } from "../components/pix.tsx";
import { AvisoDaFila } from "../components/AvisoDaFila.tsx";
import { useApp } from "./estado.ts";

function SoComConta({ children }: { children: ReactNode }) {
  const { conta, carregando } = useApp();
  const local = useLocation();
  if (carregando) return null;
  if (!conta) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return children;
}

/* Ícones das abas em pixel art, como o boot do mock troca (TABI: caveira, haltere, gráfico e prancheta). */
const ICONES: Record<string, ReactNode> = {
  hoje: <Pix nome="skull" w={22} />, treino: <Pix nome="dumb" w={22} />, progresso: <Pix nome="chart" w={22} />, plano: <Pix nome="plan" w={22} />
};
const ABAS = [["hoje", "/", "Hoje"], ["treino", "/treino", "Treino"], ["progresso", "/progresso", "Progresso"], ["plano", "/plano", "Plano"]] as const;

function Abas() {
  const local = useLocation();
  const navegar = useNavigate();
  const ativa = (para: string) => (para === "/" ? local.pathname === "/" : local.pathname.startsWith(para));
  const aoVivo = useTreino(x => !!x.sessao);
  return (
    <nav className="tabs four" role="tablist" aria-label="Seções">
      {ABAS.map(([id, para, nome]) => (
        <button key={id} role="tab" aria-selected={ativa(para)} data-v={id} onClick={() => navegar(para)}>{ICONES[id]}{nome}{id === "treino" && aoVivo && <i className="live" />}</button>
      ))}
    </nav>
  );
}

function Moldura() {
  const fogoCv = useRef<HTMLCanvasElement>(null);
  const local = useLocation();
  const aba = local.pathname === "/" ? "hoje" : local.pathname.slice(1).split("/")[0];
  const aoVivo = useTreino(x => !!x.sessao);
  const restaurar = useTreino(x => x.restaurar);
  useEffect(() => { void restaurar(); }, [restaurar]);
  useEffect(() => {
    const pararFogo = fogoCv.current ? fogo(fogoCv.current) : () => {};
    const pararFaces = facesVivas();
    return () => { pararFogo(); pararFaces(); };
  }, []);
  return (
    <div className="shell">
      <main className="app" id="app" tabIndex={-1}>
        <canvas id="fireCv" ref={fogoCv} width={96} height={64} aria-hidden="true" />
        <AvisoDaFila />
        <div className="screens">
          <section className={`screen${aba === "treino" && aoVivo ? " live" : ""}`} id={`v-${aba}`}><Outlet /></section>
        </div>
        <Clarao />
        <RodapeDoDescanso />
        <Abas />
        <Dicas />
        <Toast />
      </main>
    </div>
  );
}

export function App() {
  const carregar = useApp(s => s.carregar);
  useEffect(() => { void carregar(); }, [carregar]);
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/confirmar" element={<Confirmar />} />
      <Route path="/esqueci" element={<Esqueci />} />
      <Route path="/redefinir" element={<Redefinir />} />
      <Route element={<SoComConta><Moldura /></SoComConta>}>
        <Route index element={<Hoje />} />
        <Route path="treino" element={<Treino />} />
        <Route path="progresso" element={<EmBreve tela="Progresso" />} />
        <Route path="plano" element={<Plano />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

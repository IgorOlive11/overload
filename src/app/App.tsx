// Casca do app com a marcação do mock (design/mock/estrutura.html): .shell > .app > .screens e as quatro abas.
// As telas Hoje, Treino, Progresso e Plano chegam no bloco 2.
import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Cadastro, Confirmar, Entrar, Esqueci, Redefinir } from "../features/conta/telas.tsx";
import { EmBreve } from "../features/inicio/EmBreve.tsx";
import { Plano } from "../features/plano/Plano.tsx";
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
  return (
    <nav className="tabs four" role="tablist" aria-label="Seções">
      {ABAS.map(([id, para, nome]) => (
        <button key={id} role="tab" aria-selected={ativa(para)} data-v={id} onClick={() => navegar(para)}>{ICONES[id]}{nome}</button>
      ))}
    </nav>
  );
}

function Moldura() {
  return (
    <div className="shell">
      <main className="app" id="app" tabIndex={-1}>
        <AvisoDaFila />
        <div className="screens">
          <section className="screen"><Outlet /></section>
        </div>
        <Abas />
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
        <Route index element={<EmBreve tela="Hoje" />} />
        <Route path="treino" element={<EmBreve tela="Treino" />} />
        <Route path="progresso" element={<EmBreve tela="Progresso" />} />
        <Route path="plano" element={<Plano />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

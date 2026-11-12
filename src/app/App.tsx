// Casca do app com a marcação do mock (design/mock/estrutura.html): .shell > .app > .screens e as quatro abas.
// As telas Hoje, Treino, Progresso e Plano chegam no bloco 2.
import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Cadastro, Confirmar, Entrar, Esqueci, Redefinir } from "../features/conta/telas.tsx";
import { EmBreve } from "../features/inicio/EmBreve.tsx";
import { AvisoDaFila } from "../components/AvisoDaFila.tsx";
import { useApp } from "./estado.ts";

function SoComConta({ children }: { children: ReactNode }) {
  const { conta, carregando } = useApp();
  const local = useLocation();
  if (carregando) return null;
  if (!conta) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return children;
}

const ICONES: Record<string, ReactNode> = {
  hoje: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  treino: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 12h2M20 12h2M6 7v10M18 7v10M9 9v6M15 9v6M9 12h6" /></svg>,
  progresso: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 20h18M5 16l5-5 4 3 6-7" /></svg>,
  plano: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></svg>
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
        <Route path="plano" element={<EmBreve tela="Plano" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

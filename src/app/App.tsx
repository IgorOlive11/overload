// Rotas e moldura do app. As telas de Hoje, Plano, Treino e Progresso chegam no bloco 2.
import { useEffect, type ReactNode } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Cadastro, Confirmar, Entrar, Esqueci, Redefinir } from "../features/conta/telas.tsx";
import { EmBreve } from "../features/inicio/EmBreve.tsx";
import { AvisoDaFila } from "../components/AvisoDaFila.tsx";
import { useApp } from "./estado.ts";

function SoComConta({ children }: { children: ReactNode }) {
  const { conta, carregando } = useApp();
  const local = useLocation();
  if (carregando) return <p className="p-4 text-muted">Carregando...</p>;
  if (!conta) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return children;
}

function Moldura() {
  const { conta, sair, fila: f } = useApp();
  const aba = ({ isActive }: { isActive: boolean }) =>
    `flex-1 py-3 text-center uppercase tracking-[0.05em] ${isActive ? "text-accent" : "text-muted"}`;
  const sairComCuidado = async () => {
    if (f.pendentes && !confirm(`Ainda há ${f.pendentes} registro(s) sem enviar. Sair agora apaga esses registros do aparelho. Sair mesmo assim?`)) return;
    await sair();
  };
  return (
    <div className="flex min-h-full flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <span className="text-3xl text-accent">OVERLOAD</span>
        <button className="link text-base" onClick={() => void sairComCuidado()}>Sair ({conta?.nome})</button>
      </header>
      <AvisoDaFila />
      <main className="flex-1 px-4 py-4"><Outlet /></main>
      <nav className="sticky bottom-0 flex border-t border-line bg-bg">
        <NavLink to="/" end className={aba}>Hoje</NavLink>
        <NavLink to="/plano" className={aba}>Plano</NavLink>
        <NavLink to="/progresso" className={aba}>Progresso</NavLink>
      </nav>
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
        <Route path="plano" element={<EmBreve tela="Plano" />} />
        <Route path="progresso" element={<EmBreve tela="Progresso" />} />
      </Route>
      <Route path="/treino" element={<SoComConta><EmBreve tela="Treino" /></SoComConta>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


import { useAuth } from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage"

export default function App() {
  const { authUser, authLoading } = useAuth()

  if (authLoading) return <div>Carregando...</div>

  if (!authUser) return <AuthPage/>

  return (
    <div>
      <h1>Overload</h1>
    </div>
  )
}
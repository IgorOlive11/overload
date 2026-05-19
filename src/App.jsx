import { useAuth } from "./hooks/useAuth";


export default function App() {
  const { authUser, authLoading } = useAuth()

  if (authLoading) return <div>Carregando...</div>
  if (!authUser) return <div>Login</div>

  return (
    <div>
      <h1>Overload</h1>
    </div>
  )
}
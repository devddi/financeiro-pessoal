import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { LogOut, Calendar, RefreshCw } from 'lucide-react'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Carregando...</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div>
      <header className="top-header">
        <div>
          <h1>Meu Financeiro</h1>
          <div className="subtitle">Análise Financeira</div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            className="btn" 
            onClick={() => supabase.auth.signOut()}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      
      <Dashboard session={session} />
    </div>
  )
}

export default App

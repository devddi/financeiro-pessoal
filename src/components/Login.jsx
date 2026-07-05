import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Wallet } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--table-col-first)' }}>
      <div className="modal-panel" style={{ width: '100%', maxWidth: '420px', margin: '1rem' }}>
        
        <div style={{ padding: '2.5rem 2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', marginBottom: '1.5rem', boxShadow: '0 10px 15px -3px rgba(15, 76, 58, 0.3)' }}>
            <Wallet size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '0.25rem' }}>
            Meu Financeiro
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Acesse sua conta para continuar
          </p>
        </div>
        
        {error && (
          <div style={{ margin: '0 2.5rem 1rem', padding: '0.75rem', borderRadius: '8px', background: '#fee2e2', color: 'var(--danger-color)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ padding: '0 2.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="field-group">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
            />
          </div>
          
          <div className="field-group">
            <label>Senha</label>
            <input
              type="password"
              placeholder="Sua senha secreta"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, justifyContent: 'center' }}
          >
            {loading ? 'Acessando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

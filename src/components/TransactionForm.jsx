import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Trash2 } from 'lucide-react'

export default function TransactionForm({ transaction, categories, onClose, onSave }) {
  const [loading, setLoading] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [installments, setInstallments] = useState(2)
  const [formData, setFormData] = useState({
    valor: '',
    quando: new Date().toISOString().split('T')[0],
    tipo: 'despesa',
    categoria: '',
    detalhes: '',
    pago: false,
    tipo_pgto: 'PIX'
  })

  useEffect(() => {
    if (transaction) {
      setFormData({
        valor: transaction.valor || '',
        quando: transaction.quando || '',
        tipo: transaction.tipo || 'despesa',
        categoria: transaction.categoria || '',
        detalhes: transaction.detalhes || '',
        pago: transaction.pago || false,
        tipo_pgto: transaction.tipo_pgto || 'PIX'
      })
    } else if (categories.length > 0) {
      setFormData(prev => ({ ...prev, categoria: categories[0].nome }))
    }
  }, [transaction, categories])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const dataToSave = { ...formData, valor: parseFloat(formData.valor) }
      if (transaction?.id) {
        const { error } = await supabase.from('financeiro_ia').update(dataToSave).eq('id', transaction.id)
        if (error) throw error
      } else {
        if (isRecurring && installments > 1) {
          const inserts = []
          const [yearStr, monthStr, dayStr] = formData.quando.split('-')
          const year = Number(yearStr)
          const month = Number(monthStr)
          const day = Number(dayStr)
          
          for (let i = 0; i < installments; i++) {
            let newMonth = month + i
            let newYear = year
            if (newMonth > 12) {
              newYear += Math.floor((newMonth - 1) / 12)
              newMonth = ((newMonth - 1) % 12) + 1
            }
            
            // Adjust day to max days in newMonth to prevent jumping to next month
            const daysInMonth = new Date(newYear, newMonth, 0).getDate()
            const clampedDay = Math.min(day, daysInMonth)
            
            const dateStr = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
            
            inserts.push({
              ...dataToSave,
              detalhes: `${formData.detalhes.trim()} (${i + 1}/${installments})`,
              quando: dateStr
            })
          }
          const { error } = await supabase.from('financeiro_ia').insert(inserts)
          if (error) throw error
        } else {
          const { error } = await supabase.from('financeiro_ia').insert([dataToSave])
          if (error) throw error
        }
      }
      onSave()
    } catch (error) {
      alert('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('financeiro_ia').delete().eq('id', transaction.id)
      if (error) throw error
      onSave()
    } catch (error) {
      alert('Erro ao excluir: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">{transaction?.id ? 'Editar registro' : 'Novo registro'}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {showConfirmDelete ? (
          <div style={{ padding: '2rem 1.75rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--danger-color)' }}>
              <Trash2 size={48} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '0.5rem' }}>Excluir transação?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Esta ação é permanente e não pode ser desfeita.</p>
            <div className="flex gap-4" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn" onClick={() => setShowConfirmDelete(false)} disabled={loading} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div className="modal-grid-2">
            <div className="field-group">
              <label>Descrição</label>
              <input type="text" name="detalhes" value={formData.detalhes} onChange={handleChange} placeholder="Ex: Supermercado, Uber..." required />
            </div>
            <div className="field-group">
              <label>Valor (R$)</label>
              <input type="number" step="0.01" name="valor" value={formData.valor} onChange={handleChange} placeholder="0,00" required />
            </div>
          </div>

          {/* Row 2 */}
          <div className="modal-grid-3">
            <div className="field-group">
              <label>Data</label>
              <input type="date" name="quando" value={formData.quando} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label>Categoria</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} required>
                {categories.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label>Pagamento</label>
              <select name="tipo_pgto" value={formData.tipo_pgto} onChange={handleChange}>
                <option value="PIX">PIX</option>
                <option value="CARTÃO">CARTÃO</option>
              </select>
            </div>
          </div>

          {/* Recurring Toggle - Only show if new transaction */}
          {!transaction?.id && (
            <div className="modal-toggle-row">
              <span className="modal-toggle-label">Repetir transação (Parcelamento)</span>
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                className={`toggle-switch ${isRecurring ? 'on' : ''}`}
                onClick={() => setIsRecurring(!isRecurring)}
              >
                <span className="toggle-thumb" />
              </button>
              
              {isRecurring && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Qtd:</label>
                  <input 
                    type="number" 
                    min="2" 
                    max="12" 
                    value={installments} 
                    onChange={(e) => {
                      let val = Number(e.target.value)
                      if (val > 12) val = 12
                      setInstallments(val)
                    }} 
                    style={{ width: '70px', padding: '0.4rem' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Toggle Pago */}
          <div className="modal-toggle-row">
            <span className="modal-toggle-label">Status do pagamento</span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.pago}
              className={`toggle-switch ${formData.pago ? 'on' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, pago: !prev.pago }))}
            >
              <span className="toggle-thumb" />
            </button>
            <span style={{ fontSize: '0.8rem', color: formData.pago ? 'var(--success-color)' : 'var(--text-muted)' }}>
              {formData.pago ? 'Pago' : 'Em aberto'}
            </span>
          </div>

          {/* Divider */}
          <div className="modal-divider" />

          {/* Actions */}
          <div className="modal-actions" style={{ justifyContent: transaction?.id ? 'space-between' : 'flex-end', alignItems: 'center' }}>
            {transaction?.id ? (
              <button 
                type="button" 
                className="btn" 
                onClick={() => setShowConfirmDelete(true)} 
                disabled={loading}
                style={{ color: 'var(--danger-color)', borderColor: 'transparent', background: 'transparent', padding: '0.5rem' }}
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <div />
            )}
            
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : transaction?.id ? 'Salvar alterações' : 'Adicionar transação'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

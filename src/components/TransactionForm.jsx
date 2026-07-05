import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Trash2 } from 'lucide-react'

export default function TransactionForm({ transaction, categories, onClose, onSave }) {
  const [loading, setLoading] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showRecurringPrompt, setShowRecurringPrompt] = useState(false)
  const [recurringInfo, setRecurringInfo] = useState(null)
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
      const validCats = categories.filter(c => !c.tipo || c.tipo === 'despesa')
      if (validCats.length > 0) {
        setFormData(prev => ({ ...prev, categoria: validCats[0].nome, tipo: 'despesa' }))
      }
    }
  }, [transaction, categories])

  const filteredCategories = categories.filter(c => !c.tipo || c.tipo === formData.tipo)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }
      
      // Se mudou o tipo (Receita/Despesa), verifica se a categoria atual continua válida
      if (name === 'tipo') {
        const validCats = categories.filter(c => !c.tipo || c.tipo === next.tipo)
        if (validCats.length > 0 && !validCats.find(c => c.nome === next.categoria)) {
          next.categoria = validCats[0].nome
        }
      }
      
      return next
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (transaction?.id) {
       const match = transaction.detalhes.match(/(.+?)\s*\((\d+)\/(\d+)\)$/)
       if (match) {
           const baseName = match[1].trim()
           const currentInst = parseInt(match[2])
           const totalInst = parseInt(match[3])
           
           if (currentInst < totalInst) {
               const oldVal = parseFloat(transaction.valor) || 0
               const newVal = parseFloat(formData.valor) || 0
               const oldDay = transaction.quando.split('-')[2]
               const newDay = formData.quando.split('-')[2]
               
               const changed = (oldVal !== newVal) || (oldDay !== newDay) || (transaction.categoria !== formData.categoria) || (transaction.tipo_pgto !== formData.tipo_pgto)
               
               if (changed) {
                   setRecurringInfo({ baseName, currentInst, totalInst })
                   setShowRecurringPrompt(true)
                   return // Intercept
               }
           }
       }
    }
    
    executeSave(false)
  }

  const executeSave = async (updateFuture) => {
    setLoading(true)
    try {
      const dataToSave = { ...formData, valor: parseFloat(formData.valor) }
      if (transaction?.id) {
        const { error } = await supabase.from('financeiro_ia').update(dataToSave).eq('id', transaction.id)
        if (error) throw error
        
        if (updateFuture && recurringInfo) {
            // Search future installments by description
            const searchPattern = `%${recurringInfo.baseName} (%/${recurringInfo.totalInst})%`
            const { data: futureTxs, error: searchError } = await supabase
               .from('financeiro_ia')
               .select('id, detalhes, quando')
               .ilike('detalhes', searchPattern)
            
            if (!searchError && futureTxs) {
                const newDay = parseInt(formData.quando.split('-')[2])
                
                const updates = futureTxs.filter(tx => {
                    if (tx.id === transaction.id) return false;
                    const m = tx.detalhes.match(/\((\d+)\/\d+\)$/)
                    if (m) {
                        return parseInt(m[1]) > recurringInfo.currentInst
                    }
                    return false;
                }).map(tx => {
                    const [fYear, fMonth] = tx.quando.split('-')
                    const daysInMonth = new Date(parseInt(fYear), parseInt(fMonth), 0).getDate()
                    const clampedDay = Math.min(newDay, daysInMonth)
                    const newDateStr = `${fYear}-${fMonth}-${String(clampedDay).padStart(2, '0')}`
                    
                    return supabase.from('financeiro_ia').update({
                        valor: dataToSave.valor,
                        categoria: dataToSave.categoria,
                        tipo_pgto: dataToSave.tipo_pgto,
                        quando: newDateStr
                    }).eq('id', tx.id)
                })
                
                await Promise.all(updates)
            }
        }
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
      setShowRecurringPrompt(false)
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
        ) : showRecurringPrompt ? (
          <div style={{ padding: '2rem 1.75rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '0.5rem' }}>Alterar parcelas futuras?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Você editou uma parcela. Deseja aplicar as alterações de (valor, data, categoria e pagamento) para todas as {recurringInfo?.totalInst - recurringInfo?.currentInst} parcelas seguintes desta recorrência?
            </p>
            <div className="flex gap-4" style={{ justifyContent: 'center', flexDirection: 'column' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={() => executeSave(true)}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Sim, alterar esta e as seguintes'}
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => executeSave(false)} 
                disabled={loading} 
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {loading ? 'Salvando...' : 'Não, alterar somente esta'}
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setShowRecurringPrompt(false)} 
                disabled={loading} 
                style={{ width: '100%', padding: '0.75rem', borderColor: 'transparent', background: 'transparent', color: 'var(--text-muted)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
          
          {/* Toggle de Tipo */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '12px' }}>
             <button type="button" 
               style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', background: formData.tipo === 'receita' ? 'var(--white)' : 'transparent', color: formData.tipo === 'receita' ? 'var(--success-color)' : 'var(--text-muted)', fontWeight: formData.tipo === 'receita' ? 700 : 500, boxShadow: formData.tipo === 'receita' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
               onClick={() => handleChange({ target: { name: 'tipo', value: 'receita', type: 'text' }})}
             >
                Receita
             </button>
             <button type="button" 
               style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', background: formData.tipo === 'despesa' ? 'var(--white)' : 'transparent', color: formData.tipo === 'despesa' ? 'var(--danger-color)' : 'var(--text-muted)', fontWeight: formData.tipo === 'despesa' ? 700 : 500, boxShadow: formData.tipo === 'despesa' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
               onClick={() => handleChange({ target: { name: 'tipo', value: 'despesa', type: 'text' }})}
             >
                Despesa
             </button>
          </div>

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
                {filteredCategories.map(c => (
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
            <span className="modal-toggle-label">{formData.tipo === 'receita' ? 'Status do recebimento' : 'Status do pagamento'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.pago}
              className={`toggle-switch ${formData.pago ? 'on' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, pago: !prev.pago }))}
            >
              <span className="toggle-thumb" />
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: formData.pago ? 'var(--success-color)' : 'var(--text-muted)' }}>
              {formData.pago ? (formData.tipo === 'receita' ? 'Recebido' : 'Pago') : (formData.tipo === 'receita' ? 'A Receber' : 'Em aberto')}
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

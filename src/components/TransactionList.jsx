import { supabase } from '../lib/supabase'
import { Edit2, CheckCircle, Circle } from 'lucide-react'

export default function TransactionList({ transactions, onEdit, onRefresh }) {
  
  const togglePago = async (transaction) => {
    try {
      const { error } = await supabase
        .from('financeiro_ia')
        .update({ pago: !transaction.pago })
        .eq('id', transaction.id)
      
      if (error) throw error
      onRefresh()
    } catch (error) {
      alert('Erro ao atualizar status: ' + error.message)
    }
  }

  if (transactions.length === 0) {
    return <div className="text-center text-muted py-4">Nenhuma transação encontrada.</div>
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Data</th>
            <th>Detalhes</th>
            <th>Categoria</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <td>
                <button 
                  className="btn-icon" 
                  onClick={() => togglePago(t)}
                  title={t.pago ? 'Marcar como não pago' : 'Marcar como pago'}
                >
                  {t.pago 
                    ? <CheckCircle size={20} className="text-success" /> 
                    : <Circle size={20} className="text-muted" />}
                </button>
              </td>
              <td>{t.quando ? new Date(t.quando).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
              <td>
                <div style={{ fontWeight: 500 }}>{t.detalhes || '-'}</div>
                {t.parcela && <div style={{ fontSize: '0.75rem' }} className="text-muted">Parcela: {t.parcela}</div>}
              </td>
              <td>
                <span className="badge badge-neutral">{t.categoria || 'Sem categoria'}</span>
              </td>
              <td>
                <span className={`badge ${t.tipo === 'receita' ? 'badge-success' : 'badge-danger'}`}>
                  {t.tipo || 'despesa'}
                </span>
              </td>
              <td style={{ fontWeight: 500, color: t.tipo === 'receita' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                R$ {Number(t.valor).toFixed(2)}
              </td>
              <td>
                <button className="btn-icon text-muted" onClick={() => onEdit(t)} title="Editar">
                  <Edit2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronRight, ChevronDown, CheckCircle, Clock, Plus, ChevronsDown, ChevronsUp } from 'lucide-react'
import TransactionForm from './TransactionForm'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [expandedTipos, setExpandedTipos] = useState(new Set(['receita', 'despesa']))
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [visibleMonths, setVisibleMonths] = useState(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
  const [selectedPgtoTypes, setSelectedPgtoTypes] = useState(new Set(['PIX', 'CARTÃO']))
  const [selectedStatus, setSelectedStatus] = useState(new Set(['Pago', 'Pendente']))

  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)

  // Configuração dos meses
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const years = [2025, 2026, 2027] // Anos disponíveis no filtro
  const pgtoOptions = ['PIX', 'CARTÃO']
  const statusOptions = ['Pago', 'Pendente']

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch categorias
      const { data: cats, error: catsError } = await supabase
        .from('financeiro_categorias')
        .select('*')
        .order('nome')
      if (catsError) throw catsError
      setCategories(cats || [])

      // Fetch apenas despesas do ano selecionado
      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`

      const { data, error } = await supabase
        .from('financeiro_ia')
        .select('id, categoria, detalhes, valor, quando, tipo, pago, tipo_pgto')
        .gte('quando', startDate)
        .lte('quando', endDate)
        .lte('quando', endDate)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      alert('Erro ao buscar dados: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedYear])

  // Lógica de Agrupamento
  const dreMap = {
    receita: { totals: Array(12).fill(0), items: {} },
    despesa: { totals: Array(12).fill(0), items: {} }
  }
  const monthlyTotals = Array(12).fill(0)

  transactions.forEach(t => {
    if (!t.quando) return
    const pgto = t.tipo_pgto || 'PIX'
    if (!selectedPgtoTypes.has(pgto)) return
    
    const statusTxt = t.pago ? 'Pago' : 'Pendente'
    if (!selectedStatus.has(statusTxt)) return
    
    const date = new Date(t.quando)
    const monthIndex = date.getUTCMonth() 
    
    const tipo = t.tipo || 'despesa'
    const cat = t.categoria || 'Sem Categoria'
    let detalhe = t.detalhes || 'Outros'
    detalhe = detalhe.replace(/\s*\(.*?\)/g, '').trim() || 'Outros'
    
    const val = Number(t.valor) || 0

    if (!dreMap[tipo]) dreMap[tipo] = { totals: Array(12).fill(0), items: {} }
    if (!dreMap[tipo].items[cat]) dreMap[tipo].items[cat] = { totals: Array(12).fill(0), items: {} }
    if (!dreMap[tipo].items[cat].items[detalhe]) {
      dreMap[tipo].items[cat].items[detalhe] = Array(12).fill(null).map(() => ({ total: 0, txs: [], isPaid: true }))
    }

    dreMap[tipo].totals[monthIndex] += val
    dreMap[tipo].items[cat].totals[monthIndex] += val
    
    const cell = dreMap[tipo].items[cat].items[detalhe][monthIndex]
    cell.total += val
    cell.txs.push(t)
    if (!t.pago) cell.isPaid = false
    
    if (tipo === 'receita') {
      monthlyTotals[monthIndex] += val
    } else {
      monthlyTotals[monthIndex] -= val
    }
  })

  const toggleTipo = (tipo) => {
    setExpandedTipos(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo)
      else next.add(tipo)
      return next
    })
  }

  const toggleCat = (tipo, cat) => {
    const key = `${tipo}-${cat}`
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const expandAll = () => {
    setExpandedTipos(new Set(['receita', 'despesa']))
    const allCats = new Set()
    Object.keys(dreMap).forEach(tipo => {
      Object.keys(dreMap[tipo].items).forEach(cat => allCats.add(`${tipo}-${cat}`))
    })
    setExpandedCats(allCats)
  }

  const collapseAll = () => {
    setExpandedTipos(new Set(['receita', 'despesa'])) // Mantém as raizes abertas
    setExpandedCats(new Set())
  }
  
  const toggleMonth = (idx) => {
    setVisibleMonths(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const togglePgto = (tipo) => {
    setSelectedPgtoTypes(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) {
        if (next.size > 1) next.delete(tipo)
      } else {
        next.add(tipo)
      }
      return next
    })
  }

  const toggleStatus = (status) => {
    setSelectedStatus(prev => {
      const next = new Set(prev)
      if (next.has(status)) {
        if (next.size > 1) next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }

  const handleEditCell = (cell, tipo, cat, det, monthIdx) => {
    if (cell.txs.length === 0) {
      // It's empty, create pre-filled new transaction
      let baseTx = null
      const monthsData = dreMap[tipo].items[cat].items[det]
      for (let i = 11; i >= 0; i--) {
         if (monthsData[i].txs.length > 0) {
             baseTx = monthsData[i].txs[0]
             break
         }
      }
      
      let day = '05'
      let pgto = 'PIX'
      if (baseTx) {
         const dateParts = baseTx.quando.split('-')
         if (dateParts.length === 3) day = dateParts[2]
         pgto = baseTx.tipo_pgto || 'PIX'
      }
      
      const year = selectedYear
      const month = monthIdx + 1
      const daysInMonth = new Date(year, month, 0).getDate()
      const safeDay = Math.min(Number(day), daysInMonth)
      const dataPreenchida = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`

      setEditingTransaction({
         tipo: tipo,
         categoria: cat,
         detalhes: det,
         valor: '',
         quando: dataPreenchida,
         pago: false,
         tipo_pgto: pgto
      })
      setShowForm(true)
      return
    }

    // Se tiver mais de uma transação agrupada na mesma célula, vamos editar a primeira por padrão
    setEditingTransaction(cell.txs[0])
    setShowForm(true)
  }

  const handleSaveForm = () => {
    setShowForm(false)
    setEditingTransaction(null)
    fetchData()
  }

  // Função auxiliar de formatação
  const formatCurrency = (val, tipo) => {
    if (val === 0) return '-'
    const formatted = Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (tipo === 'receita') return `R$ ${formatted}`
    if (tipo === 'despesa') return `-R$ ${formatted}`
    if (val < 0) return `-R$ ${formatted}` // Para o Saldo Líquido
    return `R$ ${formatted}`
  }

  const formatPercent = (val) => {
    if (val === 0 || !isFinite(val)) return '-'
    const isPositive = val > 0
    const icon = isPositive ? '▲' : '▼'
    return (
      <span className={isPositive ? 'val-positive' : 'val-negative'}>
        {icon} {Math.abs(val).toFixed(1)}%
      </span>
    )
  }

  const tiposOrder = ['receita', 'despesa']
  const tipoLabels = { receita: 'RECEITAS', despesa: 'DESPESAS' }

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar">
        <div className="year-tabs">
          {years.map(year => (
            <button 
              key={year}
              className={selectedYear === year ? 'active' : ''}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
        
        <div className="month-tabs">
          {months.map((m, idx) => (
            <button 
              key={m} 
              className={visibleMonths.has(idx) ? 'active' : ''}
              onClick={() => toggleMonth(idx)}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="month-tabs">
          {pgtoOptions.map(tipo => (
            <button 
              key={tipo}
              className={selectedPgtoTypes.has(tipo) ? 'active' : ''}
              onClick={() => togglePgto(tipo)}
            >
              {tipo}
            </button>
          ))}
        </div>

        <div className="month-tabs">
          {statusOptions.map(st => (
            <button 
              key={st}
              className={selectedStatus.has(st) ? 'active' : ''}
              onClick={() => toggleStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }}></div>

        <div className="flex gap-2">
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '0.25rem' }}
            onClick={() => {
              setEditingTransaction(null)
              setShowForm(true)
            }}
          >
            <Plus size={16} /> Nova Transação
          </button>
          <button className="btn" style={{ padding: '0.5rem' }} onClick={expandAll} title="Expandir tudo">
            <ChevronsDown size={16} />
          </button>
          <button className="btn" style={{ padding: '0.5rem' }} onClick={collapseAll} title="Recolher tudo">
            <ChevronsUp size={16} />
          </button>
        </div>
      </div>

      {/* DRE TABLE */}
      <div className="dre-container">
        <div className="dre-header-title">
          Detalhamento das Despesas
        </div>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados...</div>
        ) : (
          <div className="dre-table-wrapper">
            <table className="dre-table">
              <thead>
                <tr>
                  <th className="col-competencia" style={{ verticalAlign: 'bottom', paddingBottom: '0.5rem', height: '48px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Competência</span>
                  </th>
                  {months.map((m, idx) => visibleMonths.has(idx) && (
                    <th key={m} colSpan={2} style={{ background: 'var(--primary-color)', color: 'var(--white)', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                      {m}/{selectedYear}
                    </th>
                  ))}
                </tr>
                <tr className="dre-sub-header">
                  <th className="col-competencia" style={{ verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '1rem', color: 'var(--primary-color)', fontWeight: 700 }}>Categoria / Detalhe</span>
                  </th>
                  {months.map((m, idx) => visibleMonths.has(idx) && (
                    <Fragment key={`${m}-sub`}>
                      <th>Valor</th>
                      <th style={{ borderRight: '1px solid var(--border-color)' }}>AH</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
               <tbody>
                {tiposOrder.map(tipo => {
                  const isTipoExpanded = expandedTipos.has(tipo)
                  const categoriasDoTipo = Object.keys(dreMap[tipo].items).sort()
                  const headerColor = tipo === 'receita' ? 'var(--primary-color)' : 'var(--danger-color)'
                  
                  return (
                    <Fragment key={tipo}>
                      {/* TIPO Header Row */}
                      <tr onClick={() => toggleTipo(tipo)} style={{ cursor: 'pointer' }} className={isTipoExpanded ? `row-expanded-${tipo}` : ''}>
                        <td className="col-competencia" style={{ userSelect: 'none', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: isTipoExpanded ? 'var(--white)' : headerColor }}>
                              {isTipoExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </span>
                            <span style={{ fontWeight: 700, color: isTipoExpanded ? 'var(--white)' : headerColor }}>{tipoLabels[tipo]}</span>
                          </div>
                        </td>
                        {months.map((m, idx) => {
                          if (!visibleMonths.has(idx)) return null;
                          const val = dreMap[tipo].totals[idx]
                          let ah = 0
                          if (idx > 0) {
                            const prevVal = dreMap[tipo].totals[idx - 1]
                            if (prevVal > 0) {
                              ah = ((val / prevVal) - 1) * 100
                            } else if (val > 0) {
                              ah = 100
                            }
                          }

                          return (
                            <Fragment key={`tipo-${tipo}-${idx}`}>
                              <td className={tipo === 'receita' ? 'val-positive' : 'val-negative'} style={{ fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>{formatCurrency(val, tipo)}</td>
                              <td style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>{formatPercent(ah)}</td>
                            </Fragment>
                          )
                        })}
                      </tr>

                      {/* CATEGORIAS Rows */}
                      {isTipoExpanded && categoriasDoTipo.map(cat => {
                        const key = `${tipo}-${cat}`
                        const isCatExpanded = expandedCats.has(key)
                        const items = Object.keys(dreMap[tipo].items[cat].items).sort()

                        return (
                          <Fragment key={key}>
                            {/* Categoria Row */}
                            <tr onClick={() => toggleCat(tipo, cat)} style={{ cursor: 'pointer' }} className={isCatExpanded ? `row-expanded-${tipo}` : ''}>
                              <td className="col-competencia" style={{ userSelect: 'none', paddingLeft: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ display: 'flex', color: isCatExpanded ? 'var(--white)' : headerColor }}>
                                    {isCatExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </span>
                                  <span style={{ fontWeight: 600, color: isCatExpanded ? 'var(--white)' : headerColor }}>{cat}</span>
                                </div>
                              </td>
                              {months.map((m, idx) => {
                                if (!visibleMonths.has(idx)) return null;
                                const val = dreMap[tipo].items[cat].totals[idx]
                                let ah = 0
                                if (idx > 0) {
                                  const prevVal = dreMap[tipo].items[cat].totals[idx - 1]
                                  if (prevVal > 0) ah = ((val / prevVal) - 1) * 100
                                  else if (val > 0) ah = 100
                                }

                                return (
                                  <Fragment key={`cat-${key}-${idx}`}>
                                    <td className={tipo === 'receita' ? 'val-positive' : 'val-negative'}>{formatCurrency(val, tipo)}</td>
                                    <td style={{ borderRight: '1px solid var(--border-color)' }}>{formatPercent(ah)}</td>
                                  </Fragment>
                                )
                              })}
                            </tr>

                            {/* Sub-Items (Detalhes) Rows */}
                            {isCatExpanded && items.map(det => {
                              const hasValueInVisibleMonths = months.some((m, idx) => visibleMonths.has(idx) && dreMap[tipo].items[cat].items[det][idx].total !== 0)
                              if (!hasValueInVisibleMonths) return null;

                              return (
                                <tr key={`${key}-${det}`} className="row-detail">
                                  <td className="col-competencia" style={{ paddingLeft: '3.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                    - {det}
                                  </td>
                                  {months.map((m, idx) => {
                                    if (!visibleMonths.has(idx)) return null;
                                    const cell = dreMap[tipo].items[cat].items[det][idx]
                                    const val = cell.total
                                    let ah = 0
                                    if (idx > 0) {
                                      const prevVal = dreMap[tipo].items[cat].items[det][idx - 1].total
                                      if (prevVal > 0) ah = ((val / prevVal) - 1) * 100
                                      else if (val > 0) ah = 100
                                    }
                                    const isClickable = true;

                                    return (
                                      <Fragment key={`det-${det}-${idx}`}>
                                        <td 
                                          className={tipo === 'receita' ? 'val-positive' : 'val-negative'} 
                                          style={{ 
                                            fontSize: '0.8rem', 
                                            cursor: 'pointer',
                                            backgroundColor: cell.txs.length > 0 ? 'rgba(0,0,0,0.02)' : 'transparent'
                                          }}
                                          onClick={() => handleEditCell(cell, tipo, cat, det, idx)}
                                          title={cell.txs.length > 0 ? "Clique para editar" : "Adicionar registro"}
                                        >
                                          <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end', width: '100%' }}>
                                            <span>{formatCurrency(val, tipo)}</span>
                                            {cell.txs.length > 0 && (
                                              cell.isPaid 
                                                ? <CheckCircle size={14} style={{ color: 'var(--success-color)', flexShrink: 0 }} title={tipo === 'receita' ? 'Recebido' : 'Pago'} /> 
                                                : <Clock size={14} style={{ color: '#f59e0b', flexShrink: 0 }} title={tipo === 'receita' ? 'A Receber' : 'Pendente'} />
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ borderRight: '1px solid var(--border-color)', fontSize: '0.8rem' }}>{formatPercent(ah)}</td>
                                      </Fragment>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </Fragment>
                        )
                      })}
                    </Fragment>
                  )
                })}

                {/* Total Row (Resultado do Mês / Saldo Líquido) */}
                <tr className="total-row">
                  <td className="col-competencia" style={{ fontWeight: 700 }}>Resultado do Mês (=)</td>
                  {months.map((m, idx) => {
                    if (!visibleMonths.has(idx)) return null;

                    const totalMonth = monthlyTotals[idx]
                    
                    let ah = 0
                    if (idx > 0) {
                      const prevTotal = monthlyTotals[idx - 1]
                      // For net balance, AH can be tricky if it flips from negative to positive. We use absolute logic.
                      if (prevTotal !== 0) {
                        ah = ((totalMonth / Math.abs(prevTotal)) - Math.sign(prevTotal)) * 100
                      } else if (totalMonth !== 0) {
                        ah = totalMonth > 0 ? 100 : -100
                      }
                    }

                    return (
                      <Fragment key={`total-${idx}`}>
                        <td className={totalMonth >= 0 ? 'val-positive' : 'val-negative'} style={{ fontWeight: 700 }}>{formatCurrency(totalMonth)}</td>
                        <td style={{ borderRight: '1px solid var(--border-color)' }}>{formatPercent(ah)}</td>
                      </Fragment>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <TransactionForm 
          transaction={editingTransaction}
          categories={categories}
          onClose={() => {
            setShowForm(false)
            setEditingTransaction(null)
          }}
          onSave={handleSaveForm}
        />
      )}
    </div>
  )
}

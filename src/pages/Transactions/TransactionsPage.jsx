/**
 * OrganizaGrana — Página de Extrato (Transações)
 * Lista todas as transações agrupadas por data com filtros e busca.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { getTransactionsByMonth, deleteTransaction } from '../../services/transactions.js';
import { formatCurrency } from '../../utils/currency.js';
import { formatMonthYear, navigateMonth, groupByDate, getDateLabel } from '../../utils/dates.js';
import TransactionForm from '../../components/forms/TransactionForm.jsx';
import './TransactionsPage.css';

const TransactionsPage = () => {
  const { selectedPeriod, setSelectedPeriod, showToast, refreshTrigger } = useApp();
  const { month, year } = selectedPeriod;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all'); // 'all' | 'income' | 'expense'
  const [search, setSearch]             = useState('');
  const [editData, setEditData]         = useState(null);
  const [showForm, setShowForm]         = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactionsByMonth(month, year);
      setTransactions(data);
    } catch (err) {
      console.error('[Transactions] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData, refreshTrigger]);

  const handleDelete = async (t) => {
    const hasGroup = t.installment_group_id;

    if (!hasGroup) {
      if (!window.confirm(`Excluir "${t.description}"?`)) return;
      try {
        await deleteTransaction(t.id, 'single');
        await loadData();
        showToast('Lançamento excluído.', 'success');
      } catch (err) {
        showToast('Erro ao excluir.', 'error');
      }
      return;
    }

    // Se possui grupo de recorrência / parcelamento
    const deleteAll = window.confirm(
      `"${t.description}" é um lançamento recorrente/parcelado.\n\n` +
      `Clique em [OK] para excluir TODAS as ocorrências deste grupo, ou [Cancelar] para decidir.`
    );

    if (deleteAll) {
      try {
        await deleteTransaction(t.id, 'all');
        await loadData();
        showToast('Todas as ocorrências foram excluídas.', 'success');
      } catch (err) {
        showToast('Erro ao excluir.', 'error');
      }
    } else {
      const deleteSingle = window.confirm(`Deseja excluir Apenas este lançamento do mês?`);
      if (deleteSingle) {
        try {
          await deleteTransaction(t.id, 'single');
          await loadData();
          showToast('Lançamento deste mês excluído.', 'success');
        } catch (err) {
          showToast('Erro ao excluir.', 'error');
        }
      }
    }
  };

  const handleEdit = (t) => {
    setEditData(t);
    setShowForm(true);
  };

  // Filtragem e busca
  const filtered = transactions.filter((t) => {
    const matchFilter = filter === 'all' || t.type === filter;
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="og-page transactions-page">

      {/* Header com navegação de mês */}
      <div className="transactions-header">
        <button
          className="transactions-header__nav"
          onClick={() => setSelectedPeriod(navigateMonth(month, year, -1))}
        >‹</button>
        <h1 className="transactions-header__title" style={{ textTransform: 'capitalize' }}>
          {formatMonthYear(month, year)}
        </h1>
        <button
          className="transactions-header__nav"
          onClick={() => setSelectedPeriod(navigateMonth(month, year, +1))}
        >›</button>
      </div>

      {/* Filtros */}
      <div className="transactions-filters">
        {/* Busca */}
        <input
          className="og-input transactions-filters__search"
          type="text"
          placeholder="🔍 Buscar lançamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Chips de filtro */}
        <div className="transactions-filters__chips">
          {[
            { value: 'all',     label: 'Todos' },
            { value: 'income',  label: '↑ Receitas' },
            { value: 'expense', label: '↓ Despesas' },
          ].map(({ value, label }) => (
            <button
              key={value}
              className={`transactions-filters__chip ${filter === value ? `transactions-filters__chip--active transactions-filters__chip--${value}` : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="og-scrollable og-page-content">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
          ))
        ) : sortedDates.length === 0 ? (
          <div className="og-empty-state">
            <div className="og-empty-state__emoji">📭</div>
            <p className="og-empty-state__title">Nenhum lançamento</p>
            <p className="og-empty-state__subtitle">
              {search ? 'Tente outra busca.' : 'Adicione seu primeiro lançamento no Dashboard.'}
            </p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              <p className="og-date-separator">{getDateLabel(date)}</p>
              <div className="og-transaction-list">
                {grouped[date].map((t) => (
                  <div
                    key={t.id}
                    className="og-transaction-item"
                    onClick={() => handleEdit(t)}
                  >
                    <div
                      className="og-transaction-item__icon"
                      style={{ background: t.category_color ? `${t.category_color}22` : 'var(--color-primary-ultra)' }}
                    >
                      {t.category_icon || (t.type === 'income' ? '💰' : '💸')}
                    </div>
                    <div className="og-transaction-item__info">
                      <p className="og-transaction-item__desc">{t.description}</p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                        <span className={`og-badge ${t.type === 'income' ? 'og-badge--income' : 'og-badge--expense'}`}>
                          {t.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                        {t.payment_method === 'credit_card' && (
                          <span className="og-badge og-badge--primary">💳 Cartão</span>
                        )}
                        {t.recurrence_type === 'monthly_indefinite' && (
                          <span className="og-badge" style={{ background: 'var(--color-primary-ultra)', color: 'var(--color-primary)' }}>
                            🔄 Recorrente
                          </span>
                        )}
                        {t.recurrence_type === 'installment' && t.installment_total && (
                          <span className="og-badge" style={{ background: 'var(--color-warning-light)', color: '#B8810A' }}>
                            {t.installment_current}/{t.installment_total}x
                          </span>
                        )}
                        {t.recurrence_type === 'monthly' && t.installment_total && (
                          <span className="og-badge" style={{ background: 'var(--color-warning-light)', color: '#B8810A' }}>
                            {t.installment_current}/{t.installment_total}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className={`og-transaction-item__amount ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <button
                        className="transactions-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t); }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button className="og-fab" onClick={() => { setEditData(null); setShowForm(true); }}>+</button>

      {/* Form */}
      {showForm && (
        <TransactionForm
          initialType="expense"
          editData={editData}
          onSave={async () => { setShowForm(false); await loadData(); showToast('Salvo!', 'success'); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default TransactionsPage;

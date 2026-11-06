/**
 * OrganizaGrana — Página de Extrato (Transações)
 * Lista todas as transações agrupadas por data com filtros, busca, ordenação configurável
 * e ações modernas por Long-Press (clique e segura estilo banco digital).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard,
  Bot,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { getTransactionsByMonth, deleteTransaction, updateTransaction } from '../../services/transactions.js';
import { formatCurrency } from '../../utils/currency.js';
import { formatMonthYear, navigateMonth, groupByDate, getDateLabel } from '../../utils/dates.js';
import TransactionForm from '../../components/forms/TransactionForm.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import TransactionActionSheet from '../../components/ui/TransactionActionSheet.jsx';
import AIImportSheet from '../../components/ai/AIImportSheet.jsx';
import './TransactionsPage.css';

const TransactionsPage = () => {
  const { selectedPeriod, setSelectedPeriod, showToast, refreshTrigger, hideValues } = useApp();
  const { month, year } = selectedPeriod;

  const [transactions, setTransactions]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState('all'); // 'all' | 'income' | 'expense'
  const [sortOrder, setSortOrder]           = useState('desc'); // 'desc' (mais recentes) | 'asc' (mais antigos)
  const [search, setSearch]                 = useState('');
  const [editData, setEditData]             = useState(null);
  const [showForm, setShowForm]             = useState(false);
  const [showAiSheet, setShowAiSheet]       = useState(false);
  const [actionTx, setActionTx]             = useState(null); // Transação aberta no Action Sheet

  // Estado do modal de confirmação de deleção
  const [confirmState, setConfirmState] = useState({
    open: false,
    transaction: null,
    step: 'initial', // 'initial' | 'single'
  });

  // Referências para controle de Long-Press
  const longPressTimerRef = useRef(null);
  const isLongPressActiveRef = useRef(false);

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

  // ---- Long Press Handlers ----
  const startLongPress = (t) => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(35);
      }
      setActionTx(t);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = (t) => {
    // Se o long press foi acionado, ignora o clique de editar imediato
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    handleEdit(t);
  };

  // ---- Handlers de Ações ----
  const handleDelete = (t) => {
    setConfirmState({ open: true, transaction: t, step: 'initial' });
  };

  const handleToggleStatus = async (t) => {
    try {
      const nextStatus = t.status === 'paid' ? 'pending' : 'paid';
      await updateTransaction(t.id, { ...t, status: nextStatus }, 'single');
      await loadData();
      showToast(nextStatus === 'paid' ? 'Lançamento marcado como pago!' : 'Lançamento marcado como a pagar!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const handleCopyCode = async (code) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        showToast('Código copiado para a área de transferência!', 'success');
      } else {
        showToast('Área de transferência indisponível.', 'warning');
      }
    } catch (err) {
      showToast('Erro ao copiar código.', 'error');
    }
  };

  const closeConfirm = () => {
    setConfirmState({ open: false, transaction: null, step: 'initial' });
  };

  const execDelete = async (mode) => {
    const t = confirmState.transaction;
    closeConfirm();
    try {
      await deleteTransaction(t.id, mode);
      await loadData();
      const msgs = {
        single: 'Lançamento excluído.',
        all:    'Todas as ocorrências foram excluídas.',
      };
      showToast(msgs[mode] || 'Excluído.', 'success');
    } catch (err) {
      showToast('Erro ao excluir.', 'error');
    }
  };

  const buildConfirmProps = () => {
    const t = confirmState.transaction;
    if (!t) return {};

    const isRecurring = !!t.installment_group_id;

    if (!isRecurring) {
      return {
        icon: '🗑️',
        title: 'Excluir lançamento?',
        message: `"${t.description}" será removido permanentemente.`,
        actions: [
          {
            label: 'Excluir',
            variant: 'danger',
            onClick: () => execDelete('single'),
          },
        ],
      };
    }

    const typeLabel = t.recurrence_type === 'installment' ? 'parcelado' : 'recorrente';
    return {
      icon: '🔄',
      title: `Excluir lançamento ${typeLabel}`,
      message: `"${t.description}" faz parte de um grupo. O que deseja fazer?`,
      actions: [
        {
          label: 'Excluir apenas este mês',
          variant: 'secondary',
          onClick: () => execDelete('single'),
        },
        {
          label: 'Excluir todas as ocorrências',
          variant: 'danger',
          onClick: () => execDelete('all'),
        },
      ],
    };
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
  const sortedDates = Object.keys(grouped).sort((a, b) =>
    sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b)
  );

  const confirmProps = buildConfirmProps();

  return (
    <div className="og-page transactions-page">

      {/* Header com navegação de mês */}
      <div className="transactions-header">
        <button
          className="transactions-header__nav"
          onClick={() => setSelectedPeriod(navigateMonth(month, year, -1))}
          aria-label="Mês anterior"
        >‹</button>
        <h1 className="transactions-header__title" style={{ textTransform: 'capitalize' }}>
          {formatMonthYear(month, year)}
        </h1>
        <button
          className="transactions-header__nav"
          onClick={() => setSelectedPeriod(navigateMonth(month, year, +1))}
          aria-label="Próximo mês"
        >›</button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="transactions-filters">
        <input
          className="og-input transactions-filters__search"
          type="text"
          placeholder="🔍 Buscar lançamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="transactions-filters__row">
          {/* Chips de filtro de tipo */}
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

          {/* Botão de Ordenação (Mais recentes vs Mais antigos) */}
          <button
            className="transactions-sort-btn"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            title={sortOrder === 'desc' ? 'Ordenação: Mais recentes primeiro' : 'Ordenação: Mais antigos primeiro'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {sortOrder === 'desc' ? (
                <>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </>
              ) : (
                <>
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </>
              )}
            </svg>
            <span>{sortOrder === 'desc' ? 'Recentes' : 'Antigos'}</span>
          </button>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="og-scrollable og-page-content">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 8 }} />
          ))
        ) : sortedDates.length === 0 ? (
          <div className="og-empty-state">
            <div className="og-empty-state__emoji">📭</div>
            <p className="og-empty-state__title">Nenhum lançamento</p>
            <p className="og-empty-state__subtitle">
              {search ? 'Tente outra busca.' : 'Adicione seu primeiro lançamento com o botão +.'}
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
                    className="og-transaction-item og-transaction-item--clean"
                    onClick={() => handleCardClick(t)}
                    onTouchStart={() => startLongPress(t)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onMouseDown={() => startLongPress(t)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                  >
                    {/* Ícone da Categoria */}
                    <div
                      className="og-transaction-item__icon"
                      style={{ background: t.category_color ? `${t.category_color}22` : 'var(--color-primary-ultra)' }}
                    >
                      {t.category_icon || (t.type === 'income' ? '💰' : '💸')}
                    </div>

                    {/* Informações centrais */}
                    <div className="og-transaction-item__info">
                      <p className="og-transaction-item__desc">{t.description}</p>
                      <div className="og-transaction-item__tags">
                        <span className={`og-badge ${t.type === 'income' ? 'og-badge--income' : 'og-badge--expense'}`}>
                          {t.type === 'income' ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          {t.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                        {t.payment_method === 'credit_card' && (
                          <span className="og-badge og-badge--primary">
                            <CreditCard size={11} />
                            {t.card_name ? `${t.card_name}${t.card_last_digits ? ` (${t.card_last_digits})` : ''}` : 'Cartão'}
                          </span>
                        )}
                        {t.recurrence_type === 'monthly_indefinite' && (
                          <span className="og-badge" style={{ background: 'var(--color-primary-ultra)', color: 'var(--color-primary)' }}>
                            <RotateCw size={11} /> Recorrente
                          </span>
                        )}
                        {t.recurrence_type === 'installment' && t.installment_total && (
                          <span className="og-badge" style={{ background: 'var(--color-warning-light)', color: '#B8810A' }}>
                            {t.installment_current}/{t.installment_total}x
                          </span>
                        )}
                        {t.status === 'pending' && (
                          <span className="og-badge og-badge--pending">
                            <Clock size={11} /> A Pagar
                          </span>
                        )}
                        {t.status === 'paid' && t.payment_code && (
                          <span className="og-badge og-badge--paid">
                            <CheckCircle2 size={11} /> Pago
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor e Ação rápida */}
                    <div className="og-transaction-item__right">
                      <span className={`og-transaction-item__amount ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, false, hideValues)}
                      </span>
                      <button
                        className="og-transaction-item__more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionTx(t);
                        }}
                        aria-label="Mais opções"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FABs */}
      <div className="transactions-fab-group">
        <button
          className="og-fab og-fab--secondary transactions-fab-ai"
          onClick={() => setShowAiSheet(true)}
          title="Importar com IA"
        >
          <Bot size={22} color="#ffffff" />
        </button>
        <button
          className="og-fab"
          onClick={() => { setEditData(null); setShowForm(true); }}
          title="Novo Lançamento"
        >
          <Plus size={24} color="#ffffff" />
        </button>
      </div>

      {/* Form de Edição / Criação */}
      {showForm && (
        <TransactionForm
          initialType="expense"
          editData={editData}
          onSave={async () => { setShowForm(false); await loadData(); showToast('Salvo!', 'success'); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* AI Import */}
      {showAiSheet && (
        <AIImportSheet
          onClose={() => setShowAiSheet(false)}
          onSave={async () => { await loadData(); showToast('Lançamentos importados!', 'success'); }}
        />
      )}

      {/* Action Sheet Moderno (Estilo Banco) - Acionado por Long Press ou pelos 3 pontinhos */}
      <TransactionActionSheet
        open={!!actionTx}
        transaction={actionTx}
        onClose={() => setActionTx(null)}
        onEdit={(t) => handleEdit(t)}
        onToggleStatus={handleToggleStatus}
        onCopyCode={handleCopyCode}
        onDelete={handleDelete}
      />

      {/* Modal de confirmação de deleção */}
      <ConfirmDialog
        open={confirmState.open}
        onCancel={closeConfirm}
        icon={confirmProps.icon}
        title={confirmProps.title}
        message={confirmProps.message}
        actions={confirmProps.actions || []}
      />
    </div>
  );
};

export default TransactionsPage;

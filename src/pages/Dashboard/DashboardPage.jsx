/**
 * OrganizaGrana — Página Dashboard (Tela Inicial)
 * Exibe saldo total, ações rápidas, últimas transações e faturas ativas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { getMonthSummary, getRecentTransactions } from '../../services/transactions.js';
import { getAllCards } from '../../services/cards.js';
import { getCardInvoiceTotal } from '../../services/transactions.js';
import { getUserConfig } from '../../services/user.js';
import { formatCurrency } from '../../utils/currency.js';
import { formatMonthYear, getCurrentMonthYear, formatDateShort } from '../../utils/dates.js';
import TransactionForm from '../../components/forms/TransactionForm.jsx';
import AIImportSheet from '../../components/ai/AIImportSheet.jsx';
import AIChatSheet from '../../components/ai/AIChatSheet.jsx';
import ShoppingListsPage from '../Shopping/ShoppingListsPage.jsx';
import './DashboardPage.css';

const DashboardPage = () => {
  const { openTransactionSheet, refreshTrigger, showToast } = useApp();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardsData, setCardsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('expense');
  const [userName, setUserName] = useState('');
  const [showAiSheet, setShowAiSheet] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showShoppingLists, setShowShoppingLists] = useState(false);

  const { month, year } = getCurrentMonthYear();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [s, r, c, user] = await Promise.all([
        getMonthSummary(month, year),
        getRecentTransactions(5),
        getAllCards(),
        getUserConfig(),
      ]);
      setSummary(s);
      setRecent(r);
      setCards(c);
      if (user?.name) setUserName(user.name);

      // Carrega fatura de cada cartão no período selecionado
      const invoices = {};
      await Promise.all(
        c.map(async (card) => {
          invoices[card.id] = await getCardInvoiceTotal(card.id, card.closing_day);
        })
      );
      setCardsData(invoices);
    } catch (err) {
      console.error('[Dashboard] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData, refreshTrigger]);

  const handleOpenForm = (type) => {
    setFormType(type);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    loadData();
    showToast('Lançamento salvo!', 'success');
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="og-page dashboard-page">

      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="dashboard-header__greeting">
            Olá{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
          </p>
          <h1 className="dashboard-header__period">{formatMonthYear(month, year)}</h1>
        </div>

        {/* Botão de Consultor IA */}
        <button
          type="button"
          className="dashboard-ai-chat-btn"
          onClick={() => setShowAiChat(true)}
          title="Consultor Financeiro IA"
        >
          <span>💬</span>
          <span className="dashboard-ai-chat-btn__badge">IA</span>
        </button>
      </div>

      <div className="og-scrollable og-page-content">

        {/* Saldo Total - Hero Card */}
        <div className="og-hero-card animate-scale-in">
          <p className="og-hero-card__label">Saldo do Mês</p>
          <p className="og-hero-card__amount">
            {formatCurrency(summary?.balance ?? 0)}
          </p>
          <div className="og-hero-card__stats">
            <div className="og-hero-card__stat">
              <span>↑</span>
              <span>{formatCurrency(summary?.totalIncome ?? 0)}</span>
            </div>
            <div className="og-hero-card__stat">
              <span>↓</span>
              <span>{formatCurrency(summary?.totalExpense ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="og-quick-actions">
          <button
            className="og-quick-btn og-quick-btn--income"
            onClick={() => handleOpenForm('income')}
          >
            <div className="og-quick-btn__icon">+</div>
            <span className="og-quick-btn__label">Receita</span>
          </button>
          <button
            className="og-quick-btn og-quick-btn--expense"
            onClick={() => handleOpenForm('expense')}
          >
            <div className="og-quick-btn__icon">-</div>
            <span className="og-quick-btn__label">Despesa</span>
          </button>
          <button
            className="og-quick-btn og-quick-btn--card"
            onClick={() => handleOpenForm('expense')}
          >
            <div className="og-quick-btn__icon">💳</div>
            <span className="og-quick-btn__label">Fatura</span>
          </button>
          <button
            className="og-quick-btn og-quick-btn--ai"
            onClick={() => setShowAiSheet(true)}
          >
            <div className="og-quick-btn__icon">🤖</div>
            <span className="og-quick-btn__label">IA</span>
          </button>
          <button
            className="og-quick-btn og-quick-btn--shopping"
            onClick={() => setShowShoppingLists(true)}
          >
            <div className="og-quick-btn__icon">🛒</div>
            <span className="og-quick-btn__label">Compras</span>
          </button>
        </div>

        {/* Faturas Ativas */}
        {cards.length > 0 && (
          <div>
            <div className="og-section-header">
              <h2 className="og-section-title">Faturas Ativas</h2>
            </div>
            <div className="dashboard-cards-scroll">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="og-credit-card"
                  style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}CC 100%)` }}
                >
                  <div className="og-credit-card__header">
                    <div>
                      <p className="og-credit-card__name">{card.name}</p>
                      <p className="og-credit-card__digits">•••• {card.last_digits}</p>
                    </div>
                    <span style={{ fontSize: 24 }}>💳</span>
                  </div>
                  <div className="og-credit-card__footer">
                    <div>
                      <p className="og-credit-card__invoice-label">Fatura atual</p>
                      <p className="og-credit-card__invoice-amount">
                        {formatCurrency(cardsData[card.id] ?? 0)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="og-credit-card__due">Vence dia {card.due_day}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimos Lançamentos */}
        <div>
          <div className="og-section-header">
            <h2 className="og-section-title">Últimos Lançamentos</h2>
          </div>

          {recent.length === 0 ? (
            <div className="og-empty-state">
              <div className="og-empty-state__emoji">💸</div>
              <p className="og-empty-state__title">Nenhum lançamento ainda</p>
              <p className="og-empty-state__subtitle">
                Toque em "+ Receita" ou "+ Despesa" para começar.
              </p>
            </div>
          ) : (
            <div className="og-transaction-list">
              {recent.map((t) => (
                <div key={t.id} className="og-transaction-item">
                  <div
                    className="og-transaction-item__icon"
                    style={{ background: t.category_color ? `${t.category_color}22` : 'var(--color-primary-ultra)' }}
                  >
                    {t.category_icon || (t.type === 'income' ? '💰' : '💸')}
                  </div>
                  <div className="og-transaction-item__info">
                    <p className="og-transaction-item__desc">{t.description}</p>
                    <p className="og-transaction-item__meta">
                      {t.category_name || 'Sem categoria'} · {formatDateShort(t.date)}
                    </p>
                  </div>
                  <span
                    className={`og-transaction-item__amount ${t.type === 'income' ? 'text-income' : 'text-expense'}`}
                  >
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Formulário de transação */}
      {showForm && (
        <TransactionForm
          initialType={formType}
          onSave={handleFormSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* IA Import Sheet */}
      {showAiSheet && (
        <AIImportSheet
          onClose={() => setShowAiSheet(false)}
          onSave={() => { loadData(); showToast('Lançamentos importados!', 'success'); }}
        />
      )}

      {/* IA Chatbot Consultor */}
      {showAiChat && (
        <AIChatSheet
          onClose={() => setShowAiChat(false)}
        />
      )}

      {/* Shopping Lists Modal / Subapp */}
      {showShoppingLists && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 950 }}>
          <ShoppingListsPage
            onClose={() => {
              setShowShoppingLists(false);
              loadData();
            }}
          />
        </div>
      )}

    </div>
  );
};

// ---- Skeleton Loader ----
const DashboardSkeleton = () => (
  <div className="og-page dashboard-page">
    <div className="dashboard-header">
      <div>
        <div className="skeleton" style={{ width: 80, height: 16, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 160, height: 24 }} />
      </div>
    </div>
    <div className="og-scrollable og-page-content">
      <div className="skeleton" style={{ height: 160, borderRadius: 20 }} />
      <div style={{ display: 'flex', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: 80, borderRadius: 12 }} />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
      ))}
    </div>
  </div>
);

export default DashboardPage;

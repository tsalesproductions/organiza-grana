/**
 * OrganizaGrana — Página Dashboard (Tela Inicial)
 * Exibe saldo total com alerta máximo, modo privacidade (olhinho),
 * card de saúde financeira (score 0-1000 + previsão de saldo),
 * ações rápidas com ícones SVG modernos (receita, despesa, voz IA, foto IA, caixinhas, compras)
 * e faturas ativas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  MessageSquare,
  Plus,
  Minus,
  Mic,
  Bot,
  PiggyBank,
  ShoppingCart,
  CreditCard,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
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
import FinancialHealthCard from '../../components/reports/FinancialHealthCard.jsx';
import VoiceTransactionModal from '../../components/ai/VoiceTransactionModal.jsx';
import SavingsGoalsModal from '../../components/goals/SavingsGoalsModal.jsx';
import UpdateBanner from '../../components/ui/UpdateBanner.jsx';
import { checkForAppUpdate, dismissUpdate } from '../../services/updateService.js';
import './DashboardPage.css';

const DashboardPage = () => {
  const { refreshTrigger, showToast, hideValues, toggleHideValues } = useApp();
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
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const { month, year } = getCurrentMonthYear();

  // Verifica se há novas versões disponíveis no GitHub Releases de forma silenciosa
  useEffect(() => {
    checkForAppUpdate().then((info) => {
      if (info?.hasUpdate) {
        setUpdateInfo(info);
      }
    });
  }, []);

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

      {/* Header com Saudação, Modo Privacidade e Chat IA */}
      <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="dashboard-header__greeting">
            Olá{userName ? `, ${userName.split(' ')[0]}` : ''}!
          </p>
          <h1 className="dashboard-header__period">{formatMonthYear(month, year)}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Botão de Modo Privacidade (Olhinho) */}
          <button
            type="button"
            className="dashboard-header-icon-btn"
            onClick={toggleHideValues}
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores (Modo Privacidade)'}
            aria-label="Alternar visualização de valores"
          >
            {hideValues ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>

          {/* Botão de Consultor IA */}
          <button
            type="button"
            className="dashboard-ai-chat-btn"
            onClick={() => setShowAiChat(true)}
            title="Consultor Financeiro IA"
          >
            <MessageSquare size={19} />
            <span className="dashboard-ai-chat-btn__badge">IA</span>
          </button>
        </div>
      </div>

      <div className="og-scrollable og-page-content">

        {/* Notificação Discreta de Atualização via GitHub Releases */}
        {updateInfo && (
          <UpdateBanner
            update={updateInfo}
            onDismiss={() => {
              dismissUpdate(updateInfo.latestVersion);
              setUpdateInfo(null);
            }}
          />
        )}

        {/* Saldo Total - Hero Card com Alerta Máximo para Negativo */}
        {(() => {
          const isNegative = (summary?.balance ?? 0) < 0;
          return (
            <div className={`og-hero-card animate-scale-in ${isNegative ? 'og-hero-card--negative' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="og-hero-card__label">Saldo do Mês</p>
                {isNegative && (
                  <span className="og-hero-card__alert-tag">
                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: 3 }} />
                    Atenção: Negativo
                  </span>
                )}
              </div>
              <p className={`og-hero-card__amount ${isNegative ? 'og-hero-card__amount--negative' : ''}`}>
                {formatCurrency(summary?.balance ?? 0, false, hideValues)}
              </p>
              <div className="og-hero-card__stats">
                <div className="og-hero-card__stat">
                  <ArrowUp size={14} className="text-income" />
                  <span>{formatCurrency(summary?.totalIncome ?? 0, false, hideValues)}</span>
                </div>
                <div className="og-hero-card__stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowDown size={14} className="text-expense" />
                    <span>{formatCurrency(summary?.totalExpense ?? 0, false, hideValues)}</span>
                  </div>
                  {(summary?.totalExpensePending > 0 || summary?.totalExpensePaid > 0) && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', gap: '8px', fontWeight: 'normal' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle2 size={11} color="#00B894" />
                        {formatCurrency(summary.totalExpensePaid ?? 0, false, hideValues)}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: summary.totalExpensePending > 0 ? '#ffd32a' : 'inherit' }}>
                        <Clock size={11} />
                        {formatCurrency(summary.totalExpensePending ?? 0, false, hideValues)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Ações Rápidas Modernas com Ícones SVG (Sem Emojis) */}
        <div className="og-quick-actions">
          <button
            className="og-quick-btn og-quick-btn--income"
            onClick={() => handleOpenForm('income')}
          >
            <div className="og-quick-btn__icon">
              <Plus size={18} />
            </div>
            <span className="og-quick-btn__label">Receita</span>
          </button>

          <button
            className="og-quick-btn og-quick-btn--expense"
            onClick={() => handleOpenForm('expense')}
          >
            <div className="og-quick-btn__icon">
              <Minus size={18} />
            </div>
            <span className="og-quick-btn__label">Despesa</span>
          </button>

          <button
            className="og-quick-btn og-quick-btn--voice"
            onClick={() => setShowVoiceModal(true)}
            title="Lançamento por Comando de Voz com IA"
          >
            <div className="og-quick-btn__icon">
              <Mic size={18} />
            </div>
            <span className="og-quick-btn__label">Voz IA</span>
          </button>

          <button
            className="og-quick-btn og-quick-btn--ai"
            onClick={() => setShowAiSheet(true)}
            title="Importar comprovante com IA"
          >
            <div className="og-quick-btn__icon">
              <Bot size={18} />
            </div>
            <span className="og-quick-btn__label">Foto IA</span>
          </button>

          <button
            className="og-quick-btn og-quick-btn--goals"
            onClick={() => setShowGoalsModal(true)}
            title="Metas e Caixinhas"
          >
            <div className="og-quick-btn__icon">
              <PiggyBank size={18} />
            </div>
            <span className="og-quick-btn__label">Caixinhas</span>
          </button>

          <button
            className="og-quick-btn og-quick-btn--shopping"
            onClick={() => setShowShoppingLists(true)}
          >
            <div className="og-quick-btn__icon">
              <ShoppingCart size={18} />
            </div>
            <span className="og-quick-btn__label">Compras</span>
          </button>
        </div>

        {/* Card de Saúde Financeira & Previsão de Saldo */}
        <FinancialHealthCard />

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
                    <CreditCard size={22} color="#fff" />
                  </div>
                  <div className="og-credit-card__footer">
                    <div>
                      <p className="og-credit-card__invoice-label">Fatura atual</p>
                      <p className="og-credit-card__invoice-amount">
                        {formatCurrency(cardsData[card.id] ?? 0, false, hideValues)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="og-credit-card__due">Vence dia {card.due_day}</p>
                      <p className="og-credit-card__closing">Fecha dia {card.closing_day}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimos Lançamentos */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <div className="og-section-header">
            <h2 className="og-section-title">Últimos Lançamentos</h2>
          </div>
          {recent.length === 0 ? (
            <div className="og-empty-state">
              <p className="og-empty-state__title">Nenhum lançamento este mês</p>
              <p className="og-empty-state__subtitle">Toque nos botões acima para começar.</p>
            </div>
          ) : (
            <div className="og-card">
              <div className="og-transaction-list">
                {recent.map((t) => (
                  <div key={t.id} className="og-transaction-item">
                    <div
                      className="og-transaction-item__icon"
                      style={{ background: t.category_color ? `${t.category_color}22` : 'var(--color-primary-ultra)' }}
                    >
                      {t.category_icon || (t.type === 'income' ? <Plus size={16} /> : <Minus size={16} />)}
                    </div>
                    <div className="og-transaction-item__info">
                      <p className="og-transaction-item__desc">{t.description}</p>
                      <p className="og-transaction-item__meta">
                        {t.category_name || 'Sem categoria'} • {formatDateShort(t.date)}
                      </p>
                    </div>
                    <span className={`og-transaction-item__amount ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, false, hideValues)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Formulário de Transação Manual */}
      {showForm && (
        <TransactionForm
          initialType={formType}
          onSave={handleFormSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Modal de Lançamento por Voz com IA */}
      <VoiceTransactionModal
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSave={loadData}
        showToast={showToast}
      />

      {/* Importação por Foto com IA */}
      {showAiSheet && (
        <AIImportSheet
          onClose={() => setShowAiSheet(false)}
          onSave={loadData}
        />
      )}

      {/* Chat de Consultoria com IA */}
      {showAiChat && (
        <AIChatSheet
          onClose={() => setShowAiChat(false)}
          onOpenSettings={() => {}}
        />
      )}

      {/* Metas & Caixinhas Financeiras */}
      <SavingsGoalsModal
        open={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
      />

      {/* Modal de Listas de Compras */}
      {showShoppingLists && (
        <ShoppingListsPage
          onClose={() => setShowShoppingLists(false)}
        />
      )}

    </div>
  );
};

// Skeleton loading state
const DashboardSkeleton = () => (
  <div className="og-page dashboard-page">
    <div className="dashboard-header">
      <div className="skeleton" style={{ width: 120, height: 16, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 180, height: 28 }} />
    </div>
    <div className="og-scrollable og-page-content">
      <div className="skeleton" style={{ height: 140, borderRadius: 20, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
    </div>
  </div>
);

export default DashboardPage;

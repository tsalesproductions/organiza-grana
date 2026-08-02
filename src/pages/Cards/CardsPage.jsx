/**
 * OrganizaGrana — Página de Cartões de Crédito
 * CRUD completo de cartões com fatura calculada por período e modal de detalhamento das compras.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { getAllCards, createCard, updateCard, deleteCard } from '../../services/cards.js';
import { getCardInvoiceTotal, getCardTransactions } from '../../services/transactions.js';
import { formatCurrency } from '../../utils/currency.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import './CardsPage.css';

// Paleta de cores para cartões
const CARD_COLORS = [
  '#6C5CE7','#00B894','#E17055','#0984E3','#FD79A8',
  '#FDCB6E','#A29BFE','#00CEC9','#636E72','#2D3436',
];

const defaultForm = () => ({
  name: '', last_digits: '', closing_day: '', due_day: '',
  credit_limit: '', color: '#6C5CE7',
});

const CardsPage = () => {
  const { selectedPeriod, showToast } = useApp();
  const month = selectedPeriod?.month || (new Date().getMonth() + 1);
  const year  = selectedPeriod?.year  || new Date().getFullYear();

  const [cards, setCards]       = useState([]);
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [form, setForm]         = useState(defaultForm());
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, card: null });

  // Modal de Detalhamento do Cartão
  const [cardDetail, setCardDetail] = useState(null); // null | { card, transactions }

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getAllCards();
      setCards(c);
      const inv = {};
      await Promise.all(c.map(async (card) => {
        inv[card.id] = await getCardInvoiceTotal(card.id, card.closing_day);
      }));
      setInvoices(inv);
    } catch (err) {
      console.error('[Cards] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const openCreateForm = () => { setEditCard(null); setForm(defaultForm()); setShowForm(true); };
  const openEditForm   = (card, e) => {
    e.stopPropagation();
    setEditCard(card);
    setForm({
      name: card.name, last_digits: card.last_digits,
      closing_day: String(card.closing_day), due_day: String(card.due_day),
      credit_limit: String(card.credit_limit || ''), color: card.color,
    });
    setShowForm(true);
  };

  const handleOpenDetail = async (card) => {
    try {
      const txs = await getCardTransactions(card.id, card.closing_day);
      setCardDetail({ card, transactions: txs });
    } catch (err) {
      console.error('[Cards] Erro ao carregar detalhamento:', err);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.last_digits || !form.closing_day || !form.due_day) {
      showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }
    try {
      const data = {
        name: form.name.trim(),
        last_digits: form.last_digits.replace(/\D/g, '').slice(-4),
        closing_day: parseInt(form.closing_day),
        due_day: parseInt(form.due_day),
        credit_limit: parseFloat(form.credit_limit) || 0,
        color: form.color,
      };
      if (editCard) {
        await updateCard(editCard.id, data);
        showToast('Cartão atualizado!', 'success');
      } else {
        await createCard(data);
        showToast('Cartão adicionado!', 'success');
      }
      setShowForm(false);
      loadCards();
    } catch (err) {
      showToast('Erro ao salvar cartão.', 'error');
    }
  };

  const confirmDelete = (card, e) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, card });
  };

  const handleDelete = async () => {
    const card = deleteConfirm.card;
    setDeleteConfirm({ open: false, card: null });
    try {
      await deleteCard(card.id);
      showToast('Cartão excluído.', 'success');
      loadCards();
    } catch (err) {
      showToast('Erro ao excluir.', 'error');
    }
  };

  return (
    <div className="og-page">
      <div className="og-page-header">
        <div>
          <h1 className="og-page-header__title">Cartões</h1>
          <p className="og-page-header__subtitle">{cards.length} cartão(ões) cadastrado(s)</p>
        </div>
        <button className="og-btn og-btn--primary og-btn--sm" onClick={openCreateForm}>
          + Novo
        </button>
      </div>

      <div className="og-scrollable og-page-content">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 130, borderRadius: 20 }} />
          ))
        ) : cards.length === 0 ? (
          <div className="og-empty-state">
            <div className="og-empty-state__emoji">💳</div>
            <p className="og-empty-state__title">Nenhum cartão cadastrado</p>
            <p className="og-empty-state__subtitle">Adicione seus cartões de crédito para controlar as faturas.</p>
            <button className="og-btn og-btn--primary" style={{ marginTop: 'var(--space-4)' }} onClick={openCreateForm}>
              + Adicionar Cartão
            </button>
          </div>
        ) : (
          cards.map((card) => (
            <div key={card.id}>
              <div
                className="og-credit-card"
                style={{
                  background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}BB 100%)`,
                  cursor: 'pointer',
                }}
                onClick={() => handleOpenDetail(card)}
              >
                <div className="og-credit-card__header">
                  <div>
                    <p className="og-credit-card__name">{card.name}</p>
                    <p className="og-credit-card__digits">•••• {card.last_digits}</p>
                  </div>
                  <div className="cards-actions">
                    <button
                      className="cards-action-btn"
                      onClick={(e) => openEditForm(card, e)}
                      aria-label="Editar cartão"
                    >
                      ✏️
                    </button>
                    <button
                      className="cards-action-btn cards-action-btn--delete"
                      onClick={(e) => confirmDelete(card, e)}
                      aria-label="Excluir cartão"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="og-credit-card__footer">
                  <div>
                    <p className="og-credit-card__invoice-label">Fatura atual</p>
                    <p className="og-credit-card__invoice-amount">{formatCurrency(invoices[card.id] ?? 0)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="og-credit-card__due">Fecha dia {card.closing_day}</p>
                    <p className="og-credit-card__due">Vence dia {card.due_day}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalhamento da Fatura */}
      {cardDetail && (
        <>
          <div className="og-sheet-overlay" onClick={() => setCardDetail(null)} />
          <div className="og-sheet animate-slide-up" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="og-sheet__handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%', background: cardDetail.card.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff'
                }}
              >
                💳
              </div>
              <div>
                <h2 className="og-sheet__title" style={{ margin: 0 }}>{cardDetail.card.name}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  •••• {cardDetail.card.last_digits} — Total: <strong>{formatCurrency(invoices[cardDetail.card.id] || 0)}</strong>
                </p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {cardDetail.transactions.length === 0 ? (
                <div className="og-empty-state" style={{ padding: 'var(--space-4)' }}>
                  <div className="og-empty-state__emoji">🧾</div>
                  <p className="og-empty-state__title">Nenhuma compra neste mês</p>
                  <p className="og-empty-state__subtitle">Não há despesas lançadas neste cartão no período.</p>
                </div>
              ) : (
                cardDetail.transactions.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: 'var(--color-surface-subtle, #F8F9FA)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{t.category_icon || '💳'}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>{t.description}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>{t.date}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-expense)' }}>
                      -{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="og-btn og-btn--outline og-btn--full"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => setCardDetail(null)}
            >
              Fechar
            </button>
          </div>
        </>
      )}

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <>
          <div className="og-sheet-overlay" onClick={() => setShowForm(false)} />
          <div className="og-sheet">
            <div className="og-sheet__handle" />
            <h2 className="og-sheet__title">{editCard ? 'Editar Cartão' : 'Novo Cartão'}</h2>

            <div className="og-input-group">
              <label className="og-label">Nome do Cartão *</label>
              <input className="og-input" placeholder="Ex: Nubank, C6 Bank..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="og-input-group">
                <label className="og-label">Últimos 4 dígitos *</label>
                <input className="og-input" placeholder="1234" maxLength={4} inputMode="numeric" value={form.last_digits} onChange={(e) => setForm({ ...form, last_digits: e.target.value })} />
              </div>
              <div className="og-input-group">
                <label className="og-label">Limite (R$)</label>
                <input className="og-input" placeholder="0,00" inputMode="decimal" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
              </div>
              <div className="og-input-group">
                <label className="og-label">Dia de Fechamento *</label>
                <input className="og-input" placeholder="Ex: 25" inputMode="numeric" maxLength={2} value={form.closing_day} onChange={(e) => setForm({ ...form, closing_day: e.target.value })} />
              </div>
              <div className="og-input-group">
                <label className="og-label">Dia de Vencimento *</label>
                <input className="og-input" placeholder="Ex: 5" inputMode="numeric" maxLength={2} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
              </div>
            </div>

            <div className="og-input-group">
              <label className="og-label">Cor do Cartão</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CARD_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: color,
                      border: form.color === color ? '3px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'border var(--transition-fast)',
                    }}
                  />
                ))}
              </div>
            </div>

            <button className="og-btn og-btn--primary og-btn--full og-btn--lg" onClick={handleSave}>
              {editCard ? 'Salvar Alterações' : 'Adicionar Cartão'}
            </button>
          </div>
        </>
      )}

      {/* Modal de confirmação de exclusão */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onCancel={() => setDeleteConfirm({ open: false, card: null })}
        icon="🗑️"
        title="Excluir cartão?"
        message={`O cartão "${deleteConfirm.card?.name}" e todos os dados associados serão removidos.`}
        actions={[
          {
            label: 'Excluir cartão',
            variant: 'danger',
            onClick: handleDelete,
          },
        ]}
      />
    </div>
  );
};

export default CardsPage;

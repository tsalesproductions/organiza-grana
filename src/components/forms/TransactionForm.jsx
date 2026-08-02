/**
 * OrganizaGrana — Formulário de Transação (Bottom Sheet)
 * Usado para criar e editar receitas e despesas.
 * Suporta: pagamento à vista, cartão, parcelas e recorrência.
 */
import React, { useState, useEffect } from 'react';
import { createTransaction, updateTransaction } from '../../services/transactions.js';
import { getAllCategories } from '../../services/categories.js';
import { getAllCards } from '../../services/cards.js';
import { parseCurrencyInput, formatCurrency } from '../../utils/currency.js';
import { todayISO } from '../../utils/dates.js';
import './TransactionForm.css';

const TransactionForm = ({ initialType = 'expense', editData = null, onSave, onClose }) => {
  // ---- Estado do formulário ----
  const [type, setType]               = useState(editData?.type || initialType);
  const [amountStr, setAmountStr]     = useState(editData ? String(editData.amount) : '');
  const [description, setDescription] = useState(editData?.description || '');
  const [date, setDate]               = useState(editData?.date || todayISO());
  const [categoryId, setCategoryId]   = useState(editData?.category_id || null);
  const [paymentMethod, setPaymentMethod] = useState(editData?.payment_method || 'cash');
  const [cardId, setCardId]           = useState(editData?.card_id || null);
  const [recurrenceType, setRecurrenceType] = useState(null); // null | 'installment' | 'monthly'
  const [installmentTotal, setInstallmentTotal] = useState(2);
  const [installmentMonths, setInstallmentMonths] = useState(2);
  const [notes, setNotes]             = useState(editData?.notes || '');
  const [saving, setSaving]           = useState(false);

  // Dados do banco
  const [categories, setCategories]   = useState([]);
  const [cards, setCards]             = useState([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    getAllCategories(type).then(setCategories);
    getAllCards().then(setCards);
  }, [type]);

  // Ao trocar type, reseta categoria
  useEffect(() => {
    setCategoryId(null);
  }, [type]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedCard     = cards.find((c) => c.id === cardId);

  const handleSave = async () => {
    const amount = parseCurrencyInput(amountStr);

    if (!amount || amount <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    if (!description.trim()) {
      alert('Informe uma descrição.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        description: description.trim(),
        amount,
        type,
        payment_method: type === 'income' ? 'cash' : paymentMethod,
        card_id:       paymentMethod === 'credit_card' && type === 'expense' ? cardId : null,
        category_id:   categoryId,
        date,
        is_recurring:  recurrenceType === 'monthly' ? 1 : 0,
        recurrence_type: recurrenceType,
        installment_total: recurrenceType === 'installment' ? installmentTotal : null,
        installment_months: recurrenceType === 'monthly' ? installmentMonths : null,
        notes: notes.trim() || null,
      };

      if (editData) {
        await updateTransaction(editData.id, data);
      } else {
        await createTransaction(data);
      }

      onSave();
    } catch (err) {
      console.error('[TransactionForm] Erro ao salvar:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="og-sheet-overlay" onClick={onClose} />

      {/* Sheet */}
      <div className="og-sheet transaction-form">
        <div className="og-sheet__handle" />

        {/* Toggle Receita / Despesa */}
        <div className="og-toggle-group" style={{ marginBottom: 'var(--space-5)' }}>
          <button
            className={`og-toggle-btn og-toggle-btn--income ${type === 'income' ? 'og-toggle-btn--active' : ''}`}
            onClick={() => setType('income')}
          >
            ↑ Receita
          </button>
          <button
            className={`og-toggle-btn og-toggle-btn--expense ${type === 'expense' ? 'og-toggle-btn--active' : ''}`}
            onClick={() => setType('expense')}
          >
            ↓ Despesa
          </button>
        </div>

        {/* Campo de Valor */}
        <div className="transaction-form__amount-wrap">
          <span className="transaction-form__currency-symbol">R$</span>
          <input
            className="og-input og-input--large transaction-form__amount-input"
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            autoFocus
          />
        </div>

        {/* Descrição */}
        <div className="og-input-group">
          <label className="og-label">Descrição</label>
          <input
            className="og-input"
            type="text"
            placeholder="Ex: Almoço, Salário, Netflix..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Data */}
        <div className="og-input-group">
          <label className="og-label">Data</label>
          <input
            className="og-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Categoria */}
        <div className="og-input-group">
          <label className="og-label">Categoria</label>
          <button
            className="transaction-form__category-btn"
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            {selectedCategory ? (
              <>
                <span
                  className="transaction-form__category-icon"
                  style={{ background: `${selectedCategory.color}22` }}
                >
                  {selectedCategory.icon}
                </span>
                <span>{selectedCategory.name}</span>
              </>
            ) : (
              <span className="text-muted">Selecionar categoria</span>
            )}
            <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>
              {showCategoryPicker ? '▲' : '▼'}
            </span>
          </button>

          {showCategoryPicker && (
            <div className="transaction-form__category-grid">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`transaction-form__category-option ${categoryId === cat.id ? 'transaction-form__category-option--active' : ''}`}
                  onClick={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                >
                  <span
                    className="transaction-form__category-icon"
                    style={{ background: `${cat.color}22` }}
                  >
                    {cat.icon}
                  </span>
                  <span className="transaction-form__category-label">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Forma de Pagamento (apenas despesas) */}
        {type === 'expense' && (
          <>
            <div className="og-input-group">
              <label className="og-label">Forma de Pagamento</label>
              <div className="og-toggle-group">
                <button
                  className={`og-toggle-btn ${paymentMethod === 'cash' ? 'og-toggle-btn--active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  💵 À Vista
                </button>
                <button
                  className={`og-toggle-btn ${paymentMethod === 'credit_card' ? 'og-toggle-btn--active' : ''}`}
                  onClick={() => setPaymentMethod('credit_card')}
                  disabled={cards.length === 0}
                >
                  💳 Cartão
                </button>
              </div>
            </div>

            {/* Seletor de cartão */}
            {paymentMethod === 'credit_card' && cards.length > 0 && (
              <div className="og-input-group">
                <label className="og-label">Cartão</label>
                <div className="transaction-form__cards-list">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      className={`transaction-form__card-option ${cardId === card.id ? 'transaction-form__card-option--active' : ''}`}
                      onClick={() => setCardId(card.id)}
                    >
                      <span
                        className="transaction-form__card-dot"
                        style={{ background: card.color }}
                      />
                      {card.name} ••{card.last_digits}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recorrência / Parcelas */}
            {!editData && (
              <div className="og-input-group">
                <label className="og-label">Tipo de Lançamento</label>
                <div className="transaction-form__recurrence-options">
                  {[
                    { value: null,          label: '🔹 Único' },
                    { value: 'installment', label: '📅 Parcelado' },
                    { value: 'monthly',     label: '🔄 Recorrente' },
                  ].map(({ value, label }) => (
                    <button
                      key={String(value)}
                      className={`transaction-form__recurrence-btn ${recurrenceType === value ? 'transaction-form__recurrence-btn--active' : ''}`}
                      onClick={() => setRecurrenceType(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {recurrenceType === 'installment' && (
                  <div className="og-input-group" style={{ marginTop: 'var(--space-3)' }}>
                    <label className="og-label">Número de Parcelas</label>
                    <div className="transaction-form__number-selector">
                      <button onClick={() => setInstallmentTotal(Math.max(2, installmentTotal - 1))}>−</button>
                      <span>{installmentTotal}x</span>
                      <button onClick={() => setInstallmentTotal(Math.min(48, installmentTotal + 1))}>+</button>
                    </div>
                    <p className="transaction-form__hint">
                      {formatCurrency(parseCurrencyInput(amountStr) / installmentTotal)} / parcela
                    </p>
                  </div>
                )}

                {recurrenceType === 'monthly' && (
                  <div className="og-input-group" style={{ marginTop: 'var(--space-3)' }}>
                    <label className="og-label">Repetir por quantos meses?</label>
                    <div className="transaction-form__number-selector">
                      <button onClick={() => setInstallmentMonths(Math.max(2, installmentMonths - 1))}>−</button>
                      <span>{installmentMonths} meses</span>
                      <button onClick={() => setInstallmentMonths(Math.min(60, installmentMonths + 1))}>+</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Notas */}
        <div className="og-input-group">
          <label className="og-label">Notas (opcional)</label>
          <input
            className="og-input"
            type="text"
            placeholder="Observações adicionais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Botão Salvar */}
        <button
          className={`og-btn og-btn--primary og-btn--full og-btn--lg ${saving ? '' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <span className="onboarding-spinner" /> : `Salvar ${type === 'income' ? 'Receita' : 'Despesa'}`}
        </button>

      </div>
    </>
  );
};

export default TransactionForm;

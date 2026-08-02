/**
 * OrganizaGrana — Formulário de Transação (Bottom Sheet)
 * Usado para criar e editar receitas e despesas.
 * Suporta: pagamento à vista, cartão, parcelas e recorrência (fixa/indeterminada).
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { createTransaction, updateTransaction } from '../../services/transactions.js';
import { getAllCategories } from '../../services/categories.js';
import { getAllCards } from '../../services/cards.js';
import { parseCurrencyInput, formatCurrencyInput, formatCurrency } from '../../utils/currency.js';
import { todayISO } from '../../utils/dates.js';
import './TransactionForm.css';

const TransactionForm = ({ initialType = 'expense', editData = null, onSave, onClose }) => {
  const { showToast } = useApp();

  // ---- Estado do formulário ----
  const [type, setType]               = useState(editData?.type || initialType);
  const [amountStr, setAmountStr]     = useState(editData ? formatCurrencyInput(editData.amount) : '');
  const [description, setDescription] = useState(editData?.description || '');
  const [date, setDate]               = useState(editData?.date || todayISO());
  const [categoryId, setCategoryId]   = useState(editData?.category_id || null);
  const [paymentMethod, setPaymentMethod] = useState(editData?.payment_method || 'cash');
  const [cardId, setCardId]           = useState(editData?.card_id || null);
  
  // Recorrência & Parcelas (Para Receitas e Despesas)
  const [recurrenceMode, setRecurrenceMode] = useState(
    editData?.recurrence_type === 'monthly_indefinite' || editData?.recurrence_type === 'monthly'
      ? 'monthly'
      : editData?.recurrence_type === 'installment'
      ? 'installment'
      : null
  ); // null | 'installment' | 'monthly'
  
  const [indefinite, setIndefinite] = useState(
    editData?.recurrence_type === 'monthly_indefinite' || !editData ? true : false
  ); // true = Tempo Indeterminado, false = Prazo em meses

  const [installmentTotal, setInstallmentTotal]   = useState(editData?.installment_total || 2);
  const [installmentMonths, setInstallmentMonths] = useState(editData?.installment_total || 12);
  const [notes, setNotes]                         = useState(editData?.notes || '');
  const [saving, setSaving]                       = useState(false);

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

  // Manipula clique na opção de cartão com feedback se não houver cartão
  const handleSelectCardPayment = () => {
    if (cards.length === 0) {
      showToast('Nenhum cartão cadastrado. Cadastre um cartão na aba Cartões para usar esta opção.', 'warning');
      return;
    }
    setPaymentMethod('credit_card');
  };

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

    if (type === 'expense' && paymentMethod === 'credit_card' && !cardId) {
      alert('Por favor, selecione qual cartão de crédito será utilizado.');
      return;
    }

    setSaving(true);
    try {
      let finalRecurrenceType = recurrenceMode;
      if (recurrenceMode === 'monthly') {
        finalRecurrenceType = indefinite ? 'monthly_indefinite' : 'monthly';
      }

      const data = {
        description: description.trim(),
        amount,
        type,
        payment_method: type === 'income' ? 'cash' : paymentMethod,
        card_id:       paymentMethod === 'credit_card' && type === 'expense' ? cardId : null,
        category_id:   categoryId,
        date,
        is_recurring:  finalRecurrenceType ? 1 : 0,
        recurrence_type: finalRecurrenceType,
        installment_total: recurrenceMode === 'installment' ? installmentTotal : null,
        installment_months: recurrenceMode === 'monthly' && !indefinite ? installmentMonths : null,
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

  const currentAmountValue = parseCurrencyInput(amountStr);

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
            type="button"
            className={`og-toggle-btn og-toggle-btn--income ${type === 'income' ? 'og-toggle-btn--active' : ''}`}
            onClick={() => setType('income')}
          >
            ↑ Receita
          </button>
          <button
            type="button"
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
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            value={amountStr}
            onChange={(e) => setAmountStr(formatCurrencyInput(e.target.value))}
            autoFocus
          />
        </div>

        {/* Descrição */}
        <div className="og-input-group">
          <label className="og-label">Descrição</label>
          <input
            className="og-input"
            type="text"
            placeholder={type === 'income' ? 'Ex: Salário, Freelance, Rendimento...' : 'Ex: Aluguel, Mercado, Netflix...'}
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
            type="button"
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
                  type="button"
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

        {/* Forma de Pagamento (apenas para despesas) */}
        {type === 'expense' && (
          <>
            <div className="og-input-group">
              <label className="og-label">Forma de Pagamento</label>
              <div className="og-toggle-group">
                <button
                  type="button"
                  className={`og-toggle-btn ${paymentMethod === 'cash' ? 'og-toggle-btn--active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  💵 À Vista
                </button>
                <button
                  type="button"
                  className={`og-toggle-btn ${paymentMethod === 'credit_card' ? 'og-toggle-btn--active' : ''} ${cards.length === 0 ? 'transaction-form__card-btn--empty' : ''}`}
                  onClick={handleSelectCardPayment}
                >
                  💳 Cartão {cards.length === 0 && <span style={{ fontSize: 10, opacity: 0.6 }}>(0)</span>}
                </button>
              </div>
            </div>

            {/* Seletor de cartão */}
            {paymentMethod === 'credit_card' && cards.length > 0 && (
              <div className="og-input-group">
                <label className="og-label">Selecione o Cartão</label>
                <div className="transaction-form__cards-list">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
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
          </>
        )}

        {/* Tipo de Lançamento (Recorrência / Parcelas) — VÁLIDO PARA RECEITAS E DESPESAS */}
        {!editData && (
          <div className="og-input-group">
            <label className="og-label">Tipo de Lançamento</label>
            <div className="transaction-form__recurrence-options">
              {[
                { value: null,          label: '🔹 Único' },
                { value: 'installment', label: '📅 Parcelado' },
                { value: 'monthly',     label: '🔄 Recorrente / Fixa' },
              ].map(({ value, label }) => (
                <button
                  key={String(value)}
                  type="button"
                  className={`transaction-form__recurrence-btn ${recurrenceMode === value ? 'transaction-form__recurrence-btn--active' : ''}`}
                  onClick={() => setRecurrenceMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Se PARCELADO */}
            {recurrenceMode === 'installment' && (
              <div className="transaction-form__recurrence-box">
                <label className="og-label">Total de Parcelas</label>
                <div className="transaction-form__number-selector">
                  <button type="button" onClick={() => setInstallmentTotal(Math.max(2, installmentTotal - 1))}>−</button>
                  <span>{installmentTotal}x</span>
                  <button type="button" onClick={() => setInstallmentTotal(Math.min(72, installmentTotal + 1))}>+</button>
                </div>
                {currentAmountValue > 0 && (
                  <p className="transaction-form__hint">
                    Valor por parcela: <strong>{formatCurrency(currentAmountValue / installmentTotal)}</strong> /mês
                  </p>
                )}
              </div>
            )}

            {/* Se RECORRENTE / FIXA */}
            {recurrenceMode === 'monthly' && (
              <div className="transaction-form__recurrence-box">
                <label className="og-label">Duração da Recorrência</label>
                <div className="og-toggle-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <button
                    type="button"
                    className={`og-toggle-btn ${indefinite ? 'og-toggle-btn--active' : ''}`}
                    onClick={() => setIndefinite(true)}
                  >
                    ♾️ Tempo Indeterminado
                  </button>
                  <button
                    type="button"
                    className={`og-toggle-btn ${!indefinite ? 'og-toggle-btn--active' : ''}`}
                    onClick={() => setIndefinite(false)}
                  >
                    📅 Prazo Fixo
                  </button>
                </div>

                {indefinite ? (
                  <p className="transaction-form__hint" style={{ textAlign: 'left' }}>
                    💡 O lançamento de <strong>{formatCurrency(currentAmountValue || 0)}</strong> será repetido todo mês {type === 'income' ? '(ex: Salário, Rendimento)' : '(ex: Aluguel, Condomínio, Internet)'}.
                  </p>
                ) : (
                  <div>
                    <label className="og-label">Repetir por quantos meses?</label>
                    <div className="transaction-form__number-selector">
                      <button type="button" onClick={() => setInstallmentMonths(Math.max(2, installmentMonths - 1))}>−</button>
                      <span>{installmentMonths} meses</span>
                      <button type="button" onClick={() => setInstallmentMonths(Math.min(60, installmentMonths + 1))}>+</button>
                    </div>
                    <p className="transaction-form__hint">
                      Serão criados <strong>{installmentMonths} lançamentos mensais</strong> de {formatCurrency(currentAmountValue || 0)}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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
          type="button"
          className="og-btn og-btn--primary og-btn--full og-btn--lg"
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

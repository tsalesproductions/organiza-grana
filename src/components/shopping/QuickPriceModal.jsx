/**
 * OrganizaGrana — QuickPriceModal
 * Modal rápido para definir/editar preço e quantidade de um item da lista de compras.
 */
import React, { useState } from 'react';
import { formatCurrencyInput, parseCurrencyInput } from '../../utils/currency.js';
import './QuickPriceModal.css';

const QuickPriceModal = ({ item, onSave, onClose }) => {
  const [priceStr, setPriceStr] = useState(
    item.unit_price ? formatCurrencyInput(item.unit_price) : ''
  );
  const [quantity, setQuantity] = useState(item.quantity || 1);

  const handleSave = () => {
    const unitPrice = parseCurrencyInput(priceStr);
    onSave({
      unit_price: unitPrice,
      quantity: Math.max(1, quantity),
    });
  };

  const calculatedTotal = parseCurrencyInput(priceStr) * Math.max(1, quantity);

  return (
    <>
      <div className="og-sheet-overlay" onClick={onClose} />
      <div className="quick-price-modal animate-slide-up">
        <div className="og-sheet__handle" style={{ margin: '0 auto var(--space-3)' }} />

        <div className="quick-price-modal__header">
          <span className="quick-price-modal__icon">🏷️</span>
          <div>
            <h3 className="quick-price-modal__title">{item.name}</h3>
            <p className="quick-price-modal__subtitle">Ajustar preço e quantidade</p>
          </div>
        </div>

        {/* Quantidade */}
        <div className="quick-price-modal__section">
          <label className="og-label">Quantidade</label>
          <div className="quick-price-modal__qty-selector">
            <button
              type="button"
              className="quick-price-modal__qty-btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >-</button>
            <span className="quick-price-modal__qty-val">{quantity}</span>
            <button
              type="button"
              className="quick-price-modal__qty-btn"
              onClick={() => setQuantity((q) => q + 1)}
            >+</button>
          </div>
        </div>

        {/* Preço Unitário */}
        <div className="quick-price-modal__section">
          <label className="og-label">Preço Unitário (R$)</label>
          <div className="transaction-form__amount-wrap">
            <span className="transaction-form__currency-symbol">R$</span>
            <input
              className="og-input og-input--large transaction-form__amount-input"
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={priceStr}
              onChange={(e) => setPriceStr(formatCurrencyInput(e.target.value))}
              autoFocus
            />
          </div>
        </div>

        <button
          type="button"
          className="og-btn og-btn--primary og-btn--full og-btn--lg"
          onClick={handleSave}
          style={{ marginTop: 'var(--space-2)' }}
        >
          Confirmar R$ {calculatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </button>
      </div>
    </>
  );
};

export default QuickPriceModal;

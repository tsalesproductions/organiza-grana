/**
 * OrganizaGrana — QuickPriceModal
 * Modal rápido para definir/editar preço e quantidade de um item da lista de compras.
 * Exibe a multiplicação em tempo real (unidade x quantidade = total).
 */
import React, { useState } from 'react';
import { formatCurrencyInput, parseCurrencyInput, formatCurrency } from '../../utils/currency.js';
import './QuickPriceModal.css';

const QuickPriceModal = ({ item, onSave, onClose }) => {
  const [priceStr, setPriceStr] = useState(
    item.unit_price ? formatCurrencyInput(item.unit_price) : ''
  );
  const [quantity, setQuantity] = useState(item.quantity || 1);

  const unitPrice = parseCurrencyInput(priceStr);
  const calculatedTotal = unitPrice * Math.max(1, quantity);

  const handleSave = () => {
    onSave({
      unit_price: unitPrice,
      quantity: Math.max(1, quantity),
    });
  };

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
            <span className="quick-price-modal__qty-val">{quantity} un</span>
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

        {/* Resumo da Multiplicação em Tempo Real */}
        {quantity > 1 && unitPrice > 0 && (
          <div style={{
            background: 'var(--color-surface-subtle, #F8F9FA)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            marginBottom: 'var(--space-2)'
          }}>
            💡 {quantity} un × {formatCurrency(unitPrice)} = <strong>{formatCurrency(calculatedTotal)} Total</strong>
          </div>
        )}

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

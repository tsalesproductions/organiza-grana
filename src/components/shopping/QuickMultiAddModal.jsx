/**
 * OrganizaGrana — QuickMultiAddModal
 * Lançamento Avulso Rápido para adicionar itens com múltiplos valores/marcas/quantidades.
 * Ex: Biscoitos (2x R$ 3,49 + 4x R$ 1,98 = R$ 14,90 / 6 un).
 */
import React, { useState } from 'react';
import { formatCurrencyInput, parseCurrencyInput, formatCurrency } from '../../utils/currency.js';
import './QuickMultiAddModal.css';

const QuickMultiAddModal = ({ onSave, onClose }) => {
  const [itemName, setItemName] = useState('');
  const [entries, setEntries] = useState([
    { id: 1, quantity: 1, priceStr: '' },
  ]);

  const handleAddEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: Date.now(), quantity: 1, priceStr: '' },
    ]);
  };

  const handleRemoveEntry = (id) => {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateEntry = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === 'quantity') return { ...e, quantity: Math.max(1, value) };
        if (field === 'priceStr') return { ...e, priceStr: formatCurrencyInput(value) };
        return e;
      })
    );
  };

  // Cálculo dos Totais
  let totalQty = 0;
  let totalPrice = 0;

  entries.forEach((e) => {
    const unitPrice = parseCurrencyInput(e.priceStr);
    const q = Math.max(1, e.quantity);
    totalQty += q;
    totalPrice += unitPrice * q;
  });

  const handleConfirm = () => {
    if (!itemName.trim()) {
      alert('Informe o nome do item (ex: Biscoitos, Cervejas, Sabonetes).');
      return;
    }
    if (totalPrice <= 0) {
      alert('Informe os valores dos itens.');
      return;
    }

    // Retorna o item consolidado
    onSave({
      name: `${itemName.trim()} (${totalQty} un)`,
      total_amount: totalPrice,
      unit_price: totalQty > 0 ? totalPrice / totalQty : totalPrice,
      quantity: totalQty,
    });
  };

  return (
    <>
      <div className="og-sheet-overlay" onClick={onClose} />
      <div className="quick-multi-modal animate-slide-up">
        <div className="og-sheet__handle" style={{ margin: '0 auto var(--space-3)' }} />

        <div className="quick-multi-modal__header">
          <span className="quick-multi-modal__icon">⚡</span>
          <div>
            <h3 className="quick-multi-modal__title">Lançamento Avulso Rápido</h3>
            <p className="quick-multi-modal__subtitle">Soma vários preços do mesmo item</p>
          </div>
        </div>

        {/* Nome do Item */}
        <div className="og-input-group" style={{ marginBottom: 'var(--space-3)' }}>
          <label className="og-label">Nome do Item / Categoria</label>
          <input
            className="og-input"
            type="text"
            placeholder="Ex: Biscoitos, Cervejas, Iogurtes"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista de Sub-entradas */}
        <div className="quick-multi-modal__entries">
          <label className="og-label">Quantidades e Preços</label>
          {entries.map((entry, index) => {
            const subtotal = parseCurrencyInput(entry.priceStr) * Math.max(1, entry.quantity);
            return (
              <div key={entry.id} className="quick-multi-entry-row">
                <div className="quick-multi-qty">
                  <button
                    type="button"
                    className="quick-multi-qty-btn"
                    onClick={() => handleUpdateEntry(entry.id, 'quantity', entry.quantity - 1)}
                  >-</button>
                  <span className="quick-multi-qty-val">{entry.quantity}x</span>
                  <button
                    type="button"
                    className="quick-multi-qty-btn"
                    onClick={() => handleUpdateEntry(entry.id, 'quantity', entry.quantity + 1)}
                  >+</button>
                </div>

                <div className="quick-multi-price-wrap">
                  <span className="quick-multi-curr">R$</span>
                  <input
                    className="og-input quick-multi-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={entry.priceStr}
                    onChange={(e) => handleUpdateEntry(entry.id, 'priceStr', e.target.value)}
                  />
                </div>

                {entries.length > 1 && (
                  <button
                    type="button"
                    className="quick-multi-del-btn"
                    onClick={() => handleRemoveEntry(entry.id)}
                    title="Remover este valor"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className="sim-chip sim-chip--highlight"
            onClick={handleAddEntry}
            style={{ marginTop: 4, alignSelf: 'flex-start' }}
          >
            + Adicionar outro valor / marca
          </button>
        </div>

        {/* Resumo Acumulado */}
        <div className="quick-multi-summary">
          <div>
            <span>Total Acumulado ({totalQty} un):</span>
            <strong className="text-income">{formatCurrency(totalPrice)}</strong>
          </div>
        </div>

        <button
          type="button"
          className="og-btn og-btn--primary og-btn--full og-btn--lg"
          onClick={handleConfirm}
        >
          Confirmar e Inserir na Lista
        </button>
      </div>
    </>
  );
};

export default QuickMultiAddModal;

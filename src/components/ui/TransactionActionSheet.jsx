/**
 * OrganizaGrana — TransactionActionSheet
 * Folha de ações moderna (estilo banco digital) acionada por clique e segura (long-press).
 * Design limpo, sem emojis, com ícones SVG modernos e ações diretas.
 */
import React from 'react';
import { formatCurrency } from '../../utils/currency.js';
import { formatDateBR } from '../../utils/dates.js';
import './TransactionActionSheet.css';

const TransactionActionSheet = ({
  open,
  transaction,
  onClose,
  onEdit,
  onToggleStatus,
  onCopyCode,
  onDelete,
}) => {
  if (!open || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const isPending = transaction.status === 'pending';
  const hasCode = !!transaction.payment_code;

  return (
    <>
      <div className="og-action-sheet-overlay" onClick={onClose} />
      <div className="og-action-sheet animate-slide-up" role="dialog" aria-modal="true">
        {/* Barra superior de arrasto (handle) */}
        <div className="og-action-sheet__handle-wrap" onClick={onClose}>
          <div className="og-action-sheet__handle" />
        </div>

        {/* Resumo da Transação */}
        <div className="og-action-sheet__summary">
          <div
            className="og-action-sheet__icon"
            style={{
              background: transaction.category_color ? `${transaction.category_color}22` : 'var(--color-primary-ultra)',
              color: transaction.category_color || 'var(--color-primary)',
            }}
          >
            {transaction.category_icon || (isIncome ? '💰' : '💸')}
          </div>
          <div className="og-action-sheet__details">
            <h3 className="og-action-sheet__title">{transaction.description}</h3>
            <div className="og-action-sheet__sub">
              <span>{formatDateBR(transaction.date)}</span>
              {transaction.card_name && (
                <>
                  <span className="og-action-sheet__dot">•</span>
                  <span>{transaction.card_name}</span>
                </>
              )}
            </div>
          </div>
          <div className="og-action-sheet__value-wrap">
            <span className={`og-action-sheet__amount ${isIncome ? 'text-income' : 'text-expense'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
            <span className={`og-action-sheet__status-badge ${isPending ? 'status-pending' : 'status-paid'}`}>
              {isPending ? 'A Pagar' : 'Pago'}
            </span>
          </div>
        </div>

        <div className="og-action-sheet__divider" />

        {/* Lista de Ações Modernas */}
        <div className="og-action-sheet__actions">
          {/* Alternar Status (se for despesa) */}
          {transaction.type === 'expense' && (
            <button
              className="og-action-sheet__item"
              onClick={() => {
                onClose();
                onToggleStatus?.(transaction);
              }}
            >
              <div className="og-action-sheet__item-icon icon--accent">
                {isPending ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </div>
              <div className="og-action-sheet__item-text">
                <span className="og-action-sheet__item-label">
                  {isPending ? 'Marcar como Pago' : 'Marcar como A Pagar'}
                </span>
                <span className="og-action-sheet__item-hint">
                  {isPending ? 'Muda status para liquidado no extrato' : 'Coloca como pendência futura'}
                </span>
              </div>
            </button>
          )}

          {/* Copiar Código de Pagamento / Boleto / Pix */}
          {hasCode && (
            <button
              className="og-action-sheet__item"
              onClick={() => {
                onClose();
                onCopyCode?.(transaction.payment_code);
              }}
            >
              <div className="og-action-sheet__item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </div>
              <div className="og-action-sheet__item-text">
                <span className="og-action-sheet__item-label">Copiar Código de Pagamento</span>
                <span className="og-action-sheet__item-hint">Linha digitável ou código Pix copiado</span>
              </div>
            </button>
          )}

          {/* Editar Lançamento */}
          <button
            className="og-action-sheet__item"
            onClick={() => {
              onClose();
              onEdit?.(transaction);
            }}
          >
            <div className="og-action-sheet__item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="og-action-sheet__item-text">
              <span className="og-action-sheet__item-label">Editar Detalhes</span>
              <span className="og-action-sheet__item-hint">Alterar valor, categoria, data ou forma</span>
            </div>
          </button>

          {/* Excluir Lançamento (Destrutivo) */}
          <button
            className="og-action-sheet__item og-action-sheet__item--danger"
            onClick={() => {
              onClose();
              onDelete?.(transaction);
            }}
          >
            <div className="og-action-sheet__item-icon icon--danger">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div className="og-action-sheet__item-text">
              <span className="og-action-sheet__item-label">Excluir Lançamento</span>
              <span className="og-action-sheet__item-hint">Remover este registro permanentemente</span>
            </div>
          </button>
        </div>

        {/* Botão de Fechar */}
        <div className="og-action-sheet__footer">
          <button className="og-action-sheet__cancel-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </>
  );
};

export default TransactionActionSheet;


/**
 * OrganizaGrana — ConfirmDialog
 * Modal bottom-sheet de confirmação para ações destrutivas.
 * Substitui o window.confirm() nativo por uma UX profissional.
 */
import React from 'react';
import './ConfirmDialog.css';

/**
 * @param {object} props
 * @param {boolean}  props.open       - Se o modal está visível
 * @param {string}   props.title      - Título do diálogo
 * @param {string}   props.message    - Mensagem descritiva
 * @param {string}   props.icon       - Emoji/ícone para o topo (default: '⚠️')
 * @param {Array}    props.actions    - Lista de botões: [{label, variant, onClick}]
 *                                      variant: 'danger' | 'primary' | 'secondary'
 * @param {Function} props.onCancel   - Callback ao fechar sem confirmar
 */
const ConfirmDialog = ({ open, title, message, icon = '⚠️', actions = [], onCancel }) => {
  if (!open) return null;

  return (
    <>
      <div className="confirm-overlay" onClick={onCancel} />
      <div className="confirm-sheet animate-slide-up">
        <div className="confirm-sheet__handle" />

        <div className="confirm-sheet__icon">{icon}</div>
        <h2 className="confirm-sheet__title">{title}</h2>
        {message && <p className="confirm-sheet__message">{message}</p>}

        <div className="confirm-sheet__actions">
          {actions.map((action, i) => (
            <button
              key={i}
              className={`og-btn og-btn--full confirm-btn confirm-btn--${action.variant || 'secondary'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
          <button
            className="og-btn og-btn--full confirm-btn confirm-btn--cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;

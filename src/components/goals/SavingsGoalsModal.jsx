/**
 * OrganizaGrana — SavingsGoalsModal
 * Gestão de Caixinhas / Metas Financeiras (estilo cofrinhos digitais).
 */
import React, { useState, useEffect } from 'react';
import { Target, Plus, ArrowDownRight, ArrowUpRight, Trash2, X, PiggyBank, Check } from 'lucide-react';
import { getAllGoals, createGoal, depositToGoal, withdrawFromGoal, deleteGoal } from '../../services/savingsGoals.js';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../../utils/currency.js';
import { useApp } from '../../store/AppContext.jsx';
import './SavingsGoalsModal.css';

const GOAL_COLORS = ['#6C5CE7', '#00B894', '#0984E3', '#E17055', '#FD79A8', '#636E72'];

const SavingsGoalsModal = ({ open, onClose }) => {
  const { hideValues, showToast, triggerRefresh } = useApp();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [initialStr, setInitialStr] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);

  // Modal de depósito / resgate
  const [actionModal, setActionModal] = useState(null); // { goal, mode: 'deposit' | 'withdraw' }
  const [actionAmountStr, setActionAmountStr] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllGoals();
      setGoals(data);
    } catch (err) {
      console.error('[Goals] Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
      setShowAddForm(false);
      setActionModal(null);
    }
  }, [open]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    const target = parseCurrencyInput(targetStr);
    const initial = parseCurrencyInput(initialStr);

    if (!title.trim() || target <= 0) {
      showToast('Preencha um título e uma meta válida.', 'warning');
      return;
    }

    try {
      await createGoal({
        title: title.trim(),
        target_amount: target,
        initial_amount: initial,
        color: selectedColor,
      });
      setTitle('');
      setTargetStr('');
      setInitialStr('');
      setShowAddForm(false);
      await loadData();
      triggerRefresh();
      showToast('Meta criada com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao criar meta.', 'error');
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const amount = parseCurrencyInput(actionAmountStr);
    if (amount <= 0) {
      showToast('Informe um valor válido.', 'warning');
      return;
    }

    try {
      if (actionModal.mode === 'deposit') {
        await depositToGoal(actionModal.goal.id, amount);
        showToast('Depósito registrado na caixinha!', 'success');
      } else {
        await withdrawFromGoal(actionModal.goal.id, amount);
        showToast('Resgate registrado com sucesso!', 'success');
      }
      setActionModal(null);
      setActionAmountStr('');
      await loadData();
      triggerRefresh();
    } catch (err) {
      showToast('Erro ao atualizar saldo da meta.', 'error');
    }
  };

  const handleDelete = async (goal) => {
    if (window.confirm(`Deseja excluir a caixinha "${goal.title}"?`)) {
      try {
        await deleteGoal(goal.id);
        await loadData();
        triggerRefresh();
        showToast('Meta excluída.', 'success');
      } catch (err) {
        showToast('Erro ao excluir meta.', 'error');
      }
    }
  };

  if (!open) return null;

  const totalSaved = goals.reduce((acc, g) => acc + (g.current_amount || 0), 0);

  return (
    <>
      <div className="og-goals-overlay" onClick={onClose} />
      <div className="og-goals-modal animate-slide-up" role="dialog" aria-modal="true">
        <div className="og-goals-modal__handle" onClick={onClose} />

        {/* Header */}
        <div className="og-goals-modal__header">
          <div className="og-goals-modal__header-icon">
            <PiggyBank size={22} className="text-primary" />
          </div>
          <div>
            <h2 className="og-goals-modal__title">Metas & Caixinhas</h2>
            <p className="og-goals-modal__subtitle">
              Total guardado: <strong>{formatCurrency(totalSaved, false, hideValues)}</strong>
            </p>
          </div>
          <button className="og-goals-modal__close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="og-goals-modal__content">
          {/* Formulário de Nova Meta */}
          {showAddForm ? (
            <form onSubmit={handleCreateGoal} className="og-goals-form animate-scale-in">
              <h3 className="og-goals-form__title">Nova Caixinha</h3>
              <input
                className="og-input"
                type="text"
                placeholder="Nome da meta (ex: Viagem, IPVA, Reserva)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />

              <div className="og-goals-form__row">
                <input
                  className="og-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Meta (R$ 0,00)"
                  value={targetStr}
                  onChange={(e) => setTargetStr(formatCurrencyInput(e.target.value))}
                />
                <input
                  className="og-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Já guardado (R$ 0,00)"
                  value={initialStr}
                  onChange={(e) => setInitialStr(formatCurrencyInput(e.target.value))}
                />
              </div>

              {/* Cores */}
              <div className="og-goals-colors">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`og-goals-color-btn ${selectedColor === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setSelectedColor(c)}
                  />
                ))}
              </div>

              <div className="og-goals-form__actions">
                <button
                  type="button"
                  className="og-btn og-btn--secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="og-btn og-btn--primary">
                  Criar Meta
                </button>
              </div>
            </form>
          ) : (
            <button
              className="og-goals-add-trigger"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={18} /> Criar Nova Meta / Caixinha
            </button>
          )}

          {/* Lista de Metas */}
          {loading ? (
            <p className="og-goals-empty">Carregando metas...</p>
          ) : goals.length === 0 ? (
            <div className="og-goals-empty-state">
              <Target size={36} color="var(--color-text-muted)" />
              <p className="og-goals-empty-title">Nenhuma caixinha criada</p>
              <p className="og-goals-empty-sub">Guarde dinheiro para objetivos como viagens, reserva ou compras.</p>
            </div>
          ) : (
            <div className="og-goals-list">
              {goals.map((g) => {
                const pct = Math.min(100, Math.round(((g.current_amount || 0) / g.target_amount) * 100));
                return (
                  <div key={g.id} className="og-goal-item">
                    <div className="og-goal-item__top">
                      <div className="og-goal-item__left">
                        <span className="og-goal-item__dot" style={{ background: g.color || '#6C5CE7' }} />
                        <h4 className="og-goal-item__title">{g.title}</h4>
                      </div>
                      <button
                        className="og-goal-item__delete-btn"
                        onClick={() => handleDelete(g)}
                        title="Excluir meta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="og-goal-item__values">
                      <div>
                        <span className="og-goal-item__val-curr">
                          {formatCurrency(g.current_amount || 0, false, hideValues)}
                        </span>
                        <span className="og-goal-item__val-target">
                          {' de '} {formatCurrency(g.target_amount, false, hideValues)}
                        </span>
                      </div>
                      <span className="og-goal-item__pct">{pct}%</span>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="og-goal-item__track">
                      <div
                        className="og-goal-item__fill"
                        style={{ width: `${pct}%`, background: g.color || '#6C5CE7' }}
                      />
                    </div>

                    {/* Botões de Ação */}
                    <div className="og-goal-item__actions">
                      <button
                        className="og-goal-action-btn"
                        onClick={() => {
                          setActionModal({ goal: g, mode: 'deposit' });
                          setActionAmountStr('');
                        }}
                      >
                        <ArrowDownRight size={14} className="text-income" /> Guardar
                      </button>
                      <button
                        className="og-goal-action-btn"
                        onClick={() => {
                          setActionModal({ goal: g, mode: 'withdraw' });
                          setActionAmountStr('');
                        }}
                      >
                        <ArrowUpRight size={14} className="text-expense" /> Resgatar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Depósito / Resgate Rápido */}
        {actionModal && (
          <div className="og-goal-action-dialog animate-scale-in">
            <h4 className="og-goal-action-dialog__title">
              {actionModal.mode === 'deposit' ? 'Guardar em' : 'Resgatar de'} "{actionModal.goal.title}"
            </h4>
            <input
              className="og-input"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={actionAmountStr}
              onChange={(e) => setActionAmountStr(formatCurrencyInput(e.target.value))}
              autoFocus
            />
            <div className="og-goal-action-dialog__btns">
              <button
                className="og-btn og-btn--secondary"
                onClick={() => setActionModal(null)}
              >
                Cancelar
              </button>
              <button
                className="og-btn og-btn--primary"
                onClick={handleAction}
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SavingsGoalsModal;


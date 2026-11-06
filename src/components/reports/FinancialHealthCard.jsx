/**
 * OrganizaGrana — FinancialHealthCard
 * Card moderno de Score de Saúde Financeira (0-1000) e Projeção de Saldo Futuro.
 */
import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { calculateFinancialHealth } from '../../services/financialHealth.js';
import { formatCurrency } from '../../utils/currency.js';
import { useApp } from '../../store/AppContext.jsx';
import './FinancialHealthCard.css';

const FinancialHealthCard = () => {
  const { hideValues, refreshTrigger } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateFinancialHealth()
      .then(setData)
      .catch((err) => console.error('[FinancialHealth] Erro:', err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading || !data) return null;

  const scorePct = Math.min(100, Math.max(0, (data.score / 1000) * 100));

  return (
    <div className="og-health-card animate-scale-in">
      <div className="og-health-card__top">
        <div className="og-health-card__title-wrap">
          <div className="og-health-card__badge-icon" style={{ color: data.color, background: `${data.color}18` }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="og-health-card__title">Saúde Financeira</h3>
            <span className="og-health-card__status" style={{ color: data.color }}>
              {data.label} ({data.score}/1000)
            </span>
          </div>
        </div>

        {/* Projeção de Saldo */}
        <div className="og-health-card__projection">
          <span className="og-health-card__proj-label">Previsão Fim do Mês</span>
          <span className={`og-health-card__proj-val ${data.projectedBalance < 0 ? 'text-expense' : 'text-income'}`}>
            {formatCurrency(data.projectedBalance, false, hideValues)}
          </span>
        </div>
      </div>

      {/* Barra de Progresso do Score */}
      <div className="og-health-card__bar-wrap">
        <div className="og-health-card__bar-track">
          <div
            className="og-health-card__bar-fill"
            style={{ width: `${scorePct}%`, background: data.color }}
          />
        </div>
      </div>

      {/* Dica do Score */}
      <div className="og-health-card__tip">
        {data.score < 500 ? (
          <AlertCircle size={14} className="text-expense flex-shrink-0" />
        ) : (
          <TrendingUp size={14} className="text-income flex-shrink-0" />
        )}
        <p className="og-health-card__tip-text">{data.tips}</p>
      </div>
    </div>
  );
};

export default FinancialHealthCard;


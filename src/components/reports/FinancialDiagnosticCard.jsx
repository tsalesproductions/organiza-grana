/**
 * OrganizaGrana — Componente de Diagnóstico 50/30/20
 * Exibe análise da divisão da renda em Essencial, Lazer e Reserva.
 */
import React, { useState, useEffect } from 'react';
import { getFinancialDiagnostic } from '../../services/financialAnalysis.js';
import { formatCurrency } from '../../utils/currency.js';
import './FinancialDiagnosticCard.css';

const FinancialDiagnosticCard = ({ month, year }) => {
  const [ruleType, setRuleType] = useState('50/30/20');
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getFinancialDiagnostic(month, year, ruleType).then((data) => {
      if (isMounted) {
        setDiagnostic(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [month, year, ruleType]);

  if (loading) {
    return (
      <div className="og-card og-card--padded">
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)' }}>
          Carregando diagnóstico financeiro...
        </div>
      </div>
    );
  }

  if (!diagnostic || diagnostic.totalIncome === 0) {
    return (
      <div className="og-card og-card--padded">
        <h3 className="og-section-title">📊 Diagnóstico de Renda</h3>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
          Registre receitas neste mês para visualizar o diagnóstico 50/30/20 da sua renda.
        </p>
      </div>
    );
  }

  const { targets, actualSpent, actualPct, targetPct } = diagnostic;

  const pillars = [
    {
      id: 'essential',
      title: '🏠 Necessidades Essenciais',
      idealPct: targetPct.essential * 100,
      actualPct: actualPct.essential,
      targetVal: targets.essential,
      actualVal: actualSpent.essential,
      isOver: actualSpent.essential > targets.essential,
      color: 'var(--color-primary)',
    },
    {
      id: 'lifestyle',
      title: '🎉 Estilo de Vida & Lazer',
      idealPct: targetPct.lifestyle * 100,
      actualPct: actualPct.lifestyle,
      targetVal: targets.lifestyle,
      actualVal: actualSpent.lifestyle,
      isOver: actualSpent.lifestyle > targets.lifestyle,
      color: 'var(--color-warning)',
    },
    {
      id: 'savings',
      title: '💰 Investimentos & Reserva',
      idealPct: targetPct.savings * 100,
      actualPct: actualPct.savings,
      targetVal: targets.savings,
      actualVal: actualSpent.savings,
      isOver: actualSpent.savings < targets.savings, // No caso de investimentos, menor que a meta é atenção
      isGood: actualSpent.savings >= targets.savings,
      color: 'var(--color-income)',
    },
  ];

  return (
    <div className="og-card og-card--padded diag-card">
      <div className="diag-header">
        <div>
          <h2 className="og-section-title" style={{ margin: 0 }}>
            🧠 Diagnóstico da Renda
          </h2>
          <p className="diag-subtitle">Análise de equilíbrio financeiro</p>
        </div>

        {/* Seletor de Regra */}
        <div className="diag-rule-toggle">
          <button
            className={`diag-rule-btn ${ruleType === '50/30/20' ? 'active' : ''}`}
            onClick={() => setRuleType('50/30/20')}
          >
            50/30/20
          </button>
          <button
            className={`diag-rule-btn ${ruleType === '70/20/10' ? 'active' : ''}`}
            onClick={() => setRuleType('70/20/10')}
          >
            70/20/10
          </button>
        </div>
      </div>

      <div className="diag-pillars-list">
        {pillars.map((p) => {
          let statusBadge = { text: '🟢 No Alvo', class: 'status-good' };
          if (p.id === 'savings') {
            if (p.actualVal >= p.targetVal) statusBadge = { text: '🚀 Excelente', class: 'status-good' };
            else statusBadge = { text: '🟡 Abaixo da Meta', class: 'status-warn' };
          } else {
            if (p.isOver) statusBadge = { text: '🔴 Acima do Ideal', class: 'status-alert' };
            else if (p.actualVal > p.targetVal * 0.85) statusBadge = { text: '🟡 No Limite', class: 'status-warn' };
          }

          const progressPct = Math.min(100, (p.actualVal / (p.targetVal || 1)) * 100);

          return (
            <div key={p.id} className="diag-pillar-item">
              <div className="diag-pillar-top">
                <span className="diag-pillar-title">{p.title}</span>
                <span className={`diag-pillar-badge ${statusBadge.class}`}>
                  {statusBadge.text}
                </span>
              </div>

              <div className="diag-pillar-vals">
                <div>
                  <span className="diag-val-label">Gasto Real: </span>
                  <strong className="diag-val-actual">{formatCurrency(p.actualVal)}</strong>
                  <span className="diag-val-pct"> ({p.actualPct.toFixed(0)}%)</span>
                </div>
                <div className="diag-val-ideal">
                  Meta ({p.idealPct}%): {formatCurrency(p.targetVal)}
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="diag-progress-track">
                <div
                  className="diag-progress-bar"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: p.isOver && p.id !== 'savings' ? 'var(--color-expense)' : p.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FinancialDiagnosticCard;

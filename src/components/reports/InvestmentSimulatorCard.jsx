/**
 * OrganizaGrana — Simulador de Investimentos e Juros Compostos
 * Mostra o efeito multiplicador dos aportes em 1, 5 e 10 anos.
 */
import React, { useState, useEffect } from 'react';
import { calculateCompoundInterest, getFinancialDiagnostic } from '../../services/financialAnalysis.js';
import { formatCurrency, parseCurrencyInput } from '../../utils/currency.js';
import './InvestmentSimulatorCard.css';

const InvestmentSimulatorCard = ({ month, year }) => {
  const [monthlyInput, setMonthlyInput] = useState('500');
  const [monthSurplus, setMonthSurplus] = useState(0);

  // Carrega a sobra do mês atual como sugestão inicial
  useEffect(() => {
    getFinancialDiagnostic(month, year).then((diag) => {
      if (diag && diag.monthSurplus > 0) {
        setMonthSurplus(diag.monthSurplus);
        setMonthlyInput(String(Math.round(diag.monthSurplus)));
      }
    });
  }, [month, year]);

  const depositVal = parseCurrencyInput(monthlyInput);

  // Calcula projeções para 1, 5 e 10 anos
  const proj1 = calculateCompoundInterest(depositVal, 1, 0.10);
  const proj5 = calculateCompoundInterest(depositVal, 5, 0.10);
  const proj10 = calculateCompoundInterest(depositVal, 10, 0.10);

  const projections = [
    { label: '🗓️ 1 Ano', data: proj1 },
    { label: '🗓️ 5 Anos', data: proj5 },
    { label: '🚀 10 Anos', data: proj10, highlight: true },
  ];

  return (
    <div className="og-card og-card--padded sim-card">
      <div className="sim-header">
        <div>
          <h2 className="og-section-title" style={{ margin: 0 }}>
            🚀 Simulador de Futuro & Investimentos
          </h2>
          <p className="sim-subtitle">Multiplicação do seu patrimônio com juros compostos (~10% a.a.)</p>
        </div>
      </div>

      {/* Input de Aporte Mensal */}
      <div className="sim-input-section">
        <label className="og-label" style={{ fontSize: 'var(--font-size-xs)' }}>
          Quanto você planeja investir por mês? (R$)
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            className="og-input"
            type="number"
            placeholder="Ex: 500"
            value={monthlyInput}
            onChange={(e) => setMonthlyInput(e.target.value)}
          />
        </div>

        {/* Chips de Atalho Rápido */}
        <div className="sim-chips">
          {monthSurplus > 0 && (
            <button
              className="sim-chip sim-chip--highlight"
              onClick={() => setMonthlyInput(String(Math.round(monthSurplus)))}
            >
              💡 Usar Sobra ({formatCurrency(monthSurplus)})
            </button>
          )}
          <button className="sim-chip" onClick={() => setMonthlyInput('200')}>
            R$ 200/mês
          </button>
          <button className="sim-chip" onClick={() => setMonthlyInput('500')}>
            R$ 500/mês
          </button>
          <button className="sim-chip" onClick={() => setMonthlyInput('1000')}>
            R$ 1.000/mês
          </button>
        </div>
      </div>

      {/* Cards de Projeção em 1, 5 e 10 Anos */}
      <div className="sim-proj-grid">
        {projections.map((p) => {
          const invested = p.data.totalInvested;
          const interest = p.data.interestEarned;
          const total = p.data.totalBalance;
          const investedPct = total > 0 ? (invested / total) * 100 : 100;
          const interestPct = total > 0 ? (interest / total) * 100 : 0;

          return (
            <div key={p.label} className={`sim-proj-card ${p.highlight ? 'sim-proj-card--highlight' : ''}`}>
              <div className="sim-proj-top">
                <span className="sim-proj-label">{p.label}</span>
                <span className="sim-proj-total">{formatCurrency(total)}</span>
              </div>

              {/* Barra proporcional: Investido vs Juros */}
              <div className="sim-bar-track">
                <div className="sim-bar-invested" style={{ width: `${investedPct}%` }} title="Seu Dinheiro" />
                <div className="sim-bar-interest" style={{ width: `${interestPct}%` }} title="Juros Ganho" />
              </div>

              <div className="sim-proj-details">
                <span>Investido: <strong>{formatCurrency(invested)}</strong></span>
                <span className="text-income">Juros: <strong>+{formatCurrency(interest)}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conselho/Diagnóstico */}
      {depositVal > 0 && (
        <div className="sim-advice-box">
          <p>
            💡 Investindo <strong>{formatCurrency(depositVal)}/mês</strong>, em 10 anos você acumulará{' '}
            <strong className="text-income">{formatCurrency(proj10.totalBalance)}</strong>! Destes,{' '}
            <strong>{formatCurrency(proj10.interestEarned)}</strong> virão puramente do efeito dos juros compostos.
          </p>
        </div>
      )}
    </div>
  );
};

export default InvestmentSimulatorCard;

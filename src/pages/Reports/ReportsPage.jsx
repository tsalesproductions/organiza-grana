/**
 * OrganizaGrana — Página de Relatórios
 * Exibe gráficos interativos de pizza (por categoria) e barras (histórico mensal).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useApp } from '../../store/AppContext.jsx';
import { getExpensesByCategory, getMonthlyHistory, getMonthSummary } from '../../services/transactions.js';
import { getCategoryBudgets, updateCategoryBudget } from '../../services/budgets.js';
import { formatCurrency, parseCurrencyInput } from '../../utils/currency.js';
import { formatMonthYear, navigateMonth } from '../../utils/dates.js';
import FinancialDiagnosticCard from '../../components/reports/FinancialDiagnosticCard.jsx';
import InvestmentSimulatorCard from '../../components/reports/InvestmentSimulatorCard.jsx';
import './ReportsPage.css';

const ReportsPage = () => {
  const { selectedPeriod, setSelectedPeriod, showToast } = useApp();
  const { month, year } = selectedPeriod;

  const [categoriesData, setCategoriesData] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [budgetsData, setBudgetsData]       = useState([]);
  const [summary, setSummary]               = useState(null);
  const [loading, setLoading]               = useState(true);

  // Modal para editar teto
  const [editBudgetCat, setEditBudgetCat]   = useState(null);
  const [budgetInputValue, setBudgetInputValue] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, history, sum, bdgts] = await Promise.all([
        getExpensesByCategory(month, year),
        getMonthlyHistory(6),
        getMonthSummary(month, year),
        getCategoryBudgets(month, year),
      ]);
      setCategoriesData(cats);
      setMonthlyHistory(history);
      setSummary(sum);
      setBudgetsData(bdgts);
    } catch (err) {
      console.error('[Reports] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveBudget = async () => {
    if (!editBudgetCat) return;
    try {
      const numericVal = parseCurrencyInput(budgetInputValue);
      await updateCategoryBudget(editBudgetCat.id, numericVal);
      showToast('Teto orçamentário atualizado!', 'success');
      setEditBudgetCat(null);
      setBudgetInputValue('');
      await loadData();
    } catch (err) {
      showToast('Erro ao atualizar teto.', 'error');
    }
  };

  // Formata o tooltip do BarChart
  const formatBarTooltip = (value) => formatCurrency(value);

  return (
    <div className="og-page">
      <div className="og-page-header">
        <div>
          <h1 className="og-page-header__title">Relatórios</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="transactions-header__nav"
            onClick={() => setSelectedPeriod(navigateMonth(month, year, -1))}
          >‹</button>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text)', textTransform: 'capitalize' }}>
            {formatMonthYear(month, year).split(' ')[0]}
          </span>
          <button
            className="transactions-header__nav"
            onClick={() => setSelectedPeriod(navigateMonth(month, year, +1))}
          >›</button>
        </div>
      </div>

      <div className="og-scrollable og-page-content">

        {/* Resumo do mês */}
        {summary && (
          <div className="reports-summary">
            <div className="reports-summary__item reports-summary__item--income">
              <p className="reports-summary__label">Receitas</p>
              <p className="reports-summary__value">{formatCurrency(summary.totalIncome)}</p>
            </div>
            <div className="reports-summary__divider" />
            <div className="reports-summary__item reports-summary__item--expense">
              <p className="reports-summary__label">Despesas</p>
              <p className="reports-summary__value">{formatCurrency(summary.totalExpense)}</p>
            </div>
            <div className="reports-summary__divider" />
            <div className="reports-summary__item">
              <p className="reports-summary__label">Saldo</p>
              <p className={`reports-summary__value ${summary.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        )}

        {/* Gráfico de Pizza por Categoria */}
        <div className="og-card og-card--padded">
          <h2 className="og-section-title" style={{ marginBottom: 'var(--space-4)' }}>
            Gastos por Categoria
          </h2>

          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : categoriesData.length === 0 ? (
            <div className="og-empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <div className="og-empty-state__emoji">📊</div>
              <p className="og-empty-state__title">Sem dados</p>
              <p className="og-empty-state__subtitle">Adicione despesas para ver o gráfico.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoriesData}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categoriesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.category_color || '#6C5CE7'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legenda */}
              <div className="reports-legend">
                {categoriesData.map((cat, i) => {
                  const total = categoriesData.reduce((s, c) => s + c.total, 0);
                  const pct = total > 0 ? ((cat.total / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="reports-legend__item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          className="reports-legend__dot"
                          style={{ background: cat.category_color || '#6C5CE7' }}
                        />
                        <span className="reports-legend__name">
                          {cat.category_icon} {cat.category_name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="reports-legend__pct">{pct}%</span>
                        <span className="reports-legend__value">{formatCurrency(cat.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Gráfico de Barras — Histórico Mensal */}
        <div className="og-card og-card--padded">
          <h2 className="og-section-title" style={{ marginBottom: 'var(--space-4)' }}>
            Fluxo dos Últimos 6 Meses
          </h2>

          {loading ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={monthlyHistory}
                margin={{ top: 15, right: 10, left: -15, bottom: 25 }}
                barSize={16}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={formatBarTooltip}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontFamily: 'Inter', fontSize: 12, paddingTop: 10 }}
                />
                <Bar dataKey="income"  name="Receitas" fill="var(--color-income)"  radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Diagnóstico 50/30/20 & Simulador de Futuro */}
        <FinancialDiagnosticCard month={month} year={year} />
        <InvestmentSimulatorCard month={month} year={year} />

        {/* Tetos Orçamentários */}
        <div className="og-card og-card--padded">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 className="og-section-title" style={{ margin: 0 }}>
              🎯 Tetos Orçamentários
            </h2>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Metas por Categoria
            </span>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
          ) : budgetsData.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Nenhuma categoria de despesa cadastrada.</p>
          ) : (
            <div className="reports-budgets-list">
              {budgetsData.map((cat) => {
                let statusColor = 'var(--color-border)';
                let statusEmoji = '⚪';
                if (cat.status === 'green') { statusColor = '#00B894'; statusEmoji = '🟢'; }
                else if (cat.status === 'yellow') { statusColor = '#FDCB6E'; statusEmoji = '🟡'; }
                else if (cat.status === 'red') { statusColor = '#FF7675'; statusEmoji = '🔴'; }

                return (
                  <div key={cat.id} className="reports-budget-item">
                    <div className="reports-budget-item__top">
                      <div className="reports-budget-item__title">
                        <span>{cat.icon}</span>
                        <span className="reports-budget-item__name">{cat.name}</span>
                        {cat.budget_limit > 0 && <span style={{ fontSize: 11 }}>{statusEmoji}</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="reports-budget-item__values">
                          <strong>{formatCurrency(cat.current_spent)}</strong>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                            {cat.budget_limit > 0 ? ` / ${formatCurrency(cat.budget_limit)}` : ' (sem teto)'}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="og-btn og-btn--ghost og-btn--sm"
                          style={{ padding: '2px 6px', fontSize: 13 }}
                          onClick={() => {
                            setEditBudgetCat(cat);
                            setBudgetInputValue(cat.budget_limit > 0 ? String(cat.budget_limit) : '');
                          }}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    {cat.budget_limit > 0 && (
                      <div className="reports-budget-track">
                        <div
                          className="reports-budget-fill"
                          style={{
                            width: `${Math.min(100, cat.percentage)}%`,
                            background: statusColor,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Espaçador para o fundo não colar no bottom tab bar */}
        <div style={{ height: 'calc(var(--tab-bar-height) + var(--safe-area-bottom) + var(--space-8))' }} />

      </div>

      {/* Modal Editar Teto */}
      {editBudgetCat && (
        <>
          <div className="og-sheet-overlay" onClick={() => setEditBudgetCat(null)} />
          <div className="og-sheet animate-slide-up">
            <div className="og-sheet__handle" />
            <h2 className="og-sheet__title">Definir Teto: {editBudgetCat.icon} {editBudgetCat.name}</h2>
            <div className="og-input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="og-label">Teto Máximo Mensal (R$)</label>
              <input
                className="og-input"
                type="number"
                step="0.01"
                placeholder="Ex: 1200.00 (digite 0 para remover teto)"
                value={budgetInputValue}
                onChange={(e) => setBudgetInputValue(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="og-btn og-btn--ghost og-btn--full"
                onClick={() => setEditBudgetCat(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="og-btn og-btn--primary og-btn--full"
                onClick={handleSaveBudget}
              >
                Salvar Teto
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;

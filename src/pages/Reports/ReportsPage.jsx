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
import { formatCurrency } from '../../utils/currency.js';
import { formatMonthYear, navigateMonth } from '../../utils/dates.js';
import './ReportsPage.css';

const ReportsPage = () => {
  const { selectedPeriod, setSelectedPeriod } = useApp();
  const { month, year } = selectedPeriod;

  const [categoriesData, setCategoriesData] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [summary, setSummary]               = useState(null);
  const [loading, setLoading]               = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, history, sum] = await Promise.all([
        getExpensesByCategory(month, year),
        getMonthlyHistory(6),
        getMonthSummary(month, year),
      ]);
      setCategoriesData(cats);
      setMonthlyHistory(history);
      setSummary(sum);
    } catch (err) {
      console.error('[Reports] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

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
              <ResponsiveContainer width="100%" height={200}>
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
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={monthlyHistory}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                barSize={14}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
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
                  wrapperStyle={{ fontFamily: 'Inter', fontSize: 12 }}
                />
                <Bar dataKey="income"  name="Receitas" fill="var(--color-income)"  radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
};

export default ReportsPage;

/**
 * OrganizaGrana — Serviço de Saúde Financeira & Projeção de Fluxo de Caixa
 * Calcula o Score de Saúde Financeira (0 a 1000) e a projeção do saldo no fim do mês.
 */
import { executeSql } from './db.js';
import { getCurrentMonthYear } from '../utils/dates.js';
import { getCategoryBudgets } from './budgets.js';

export const calculateFinancialHealth = async () => {
  const { month, year } = getCurrentMonthYear();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const [txResult, budgets, cardsResult] = await Promise.all([
    executeSql(
      `SELECT amount, type, status, date
       FROM transactions
       WHERE strftime('%Y-%m', date) = ?`,
      [monthStr]
    ),
    getCategoryBudgets(month, year).catch(() => []),
    executeSql('SELECT credit_limit FROM cards', []),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let pendingExpense = 0;
  let pendingIncome = 0;
  let overdueCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < txResult.rows.length; i++) {
    const t = txResult.rows.item(i);
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (t.status === 'pending') pendingIncome += t.amount;
    } else {
      totalExpense += t.amount;
      if (t.status === 'pending') {
        pendingExpense += t.amount;
        if (t.date < todayStr) overdueCount++;
      }
    }
  }

  const currentBalance = totalIncome - totalExpense;

  // Projeção: Saldo Atual + Receitas Pendentes - Despesas Pendentes
  const projectedBalance = currentBalance; // Já considera todos os lançamentos do mês cadastrados

  // --- CÁLCULO DO SCORE (0 a 1000) ---
  let score = 500; // Base inicial

  // 1. Relação Poupança / Saldo (até +300 pts)
  if (totalIncome > 0) {
    const savingsRate = (currentBalance / totalIncome);
    if (savingsRate >= 0.20) score += 300;
    else if (savingsRate >= 0.10) score += 200;
    else if (savingsRate > 0) score += 100;
    else if (savingsRate < -0.15) score -= 250;
    else score -= 150;
  } else if (totalExpense > 0) {
    score -= 200;
  }

  // 2. Respeito aos Tetos Orçamentários (até +250 pts)
  const budgeted = budgets.filter((b) => b.budget_limit > 0);
  if (budgeted.length > 0) {
    const exceeded = budgeted.filter((b) => b.real_percentage > 100);
    const nearLimit = budgeted.filter((b) => b.real_percentage >= 85 && b.real_percentage <= 100);

    if (exceeded.length === 0 && nearLimit.length === 0) score += 250;
    else if (exceeded.length === 0) score += 150;
    else score -= (exceeded.length * 80);
  } else {
    score += 50; // Bônus neutro
  }

  // 3. Contas Atrasadas (até -200 pts)
  if (overdueCount > 0) {
    score -= Math.min(250, overdueCount * 70);
  } else {
    score += 150;
  }

  // Normalização do Score entre 0 e 1000
  score = Math.max(100, Math.min(1000, Math.round(score)));

  let label = 'Regular';
  let color = '#F59E0B';
  let tips = 'Mantenha seus gastos controlados para elevar seu score.';

  if (score >= 800) {
    label = 'Excelente';
    color = '#10B981';
    tips = 'Parabéns! Suas finanças estão com fôlego e excelente controle orçamentário.';
  } else if (score >= 600) {
    label = 'Bom';
    color = '#3B82F6';
    tips = 'Você está no caminho certo. Evite gastos supérfluos nesta reta final do mês.';
  } else if (score >= 400) {
    label = 'Atenção';
    color = '#F59E0B';
    tips = 'Cuidado com os limites orçamentários. O cinto pode apertar nos próximos dias.';
  } else {
    label = 'Crítico';
    color = '#EF4444';
    tips = 'Alerta Máximo: Suas despesas superaram sua renda. Corte custos imediatamente.';
  }

  return {
    score,
    label,
    color,
    tips,
    currentBalance,
    projectedBalance,
    pendingExpense,
    pendingIncome,
    overdueCount,
  };
};


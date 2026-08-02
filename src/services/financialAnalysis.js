/**
 * OrganizaGrana — Serviço de Análise Financeira 50/30/20 & Simulador de Juros Compostos
 */
import { executeSql } from './db.js';
import { getMonthSummary } from './transactions.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

// Categorias padrão por pilar (baseado em palavras-chave do nome da categoria)
const ESSENTIAL_KEYWORDS = ['moradia', 'alimenta', 'saude', 'saúde', 'transporte', 'conta', 'luz', 'agua', 'água', 'internet', 'educa', 'farmacia', 'farmácia', 'supermercado', 'mercado', 'aluguel'];
const LIFESTYLE_KEYWORDS = ['lazer', 'compra', 'restaurante', 'viagem', 'hobby', 'entretenimento', 'bar', 'festa', 'vestuario', 'vestuário', 'presente', 'assinatura', 'streaming'];

/**
 * Classifica uma categoria no pilar: 'essential', 'lifestyle' ou 'savings'
 */
export const classifyCategoryPillar = (categoryName = '', type = 'expense') => {
  const name = categoryName.toLowerCase();

  if (name.includes('invest') || name.includes('poupança') || name.includes('reserva') || name.includes('guardar')) {
    return 'savings';
  }

  for (const kw of ESSENTIAL_KEYWORDS) {
    if (name.includes(kw)) return 'essential';
  }

  for (const kw of LIFESTYLE_KEYWORDS) {
    if (name.includes(kw)) return 'lifestyle';
  }

  // Padrão para despesas não mapeadas: Essencial se for despesa geral
  return type === 'expense' ? 'essential' : 'savings';
};

/**
 * Calcula o diagnóstico da renda segundo as regras (50/30/20 ou 70/20/10)
 * @param {number} month - 1 a 12
 * @param {number} year
 * @param {string} ruleType - '50/30/20' ou '70/20/10'
 */
export const getFinancialDiagnostic = async (month, year, ruleType = '50/30/20') => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;

  const [summary, txsResult] = await Promise.all([
    getMonthSummary(month, year),
    executeSql(
      `SELECT t.amount, t.type, c.name as category_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.date BETWEEN ? AND ?`,
      [startDate, endDate]
    ),
  ]);

  const transactions = rowsToArray(txsResult.rows);
  const totalIncome = summary?.totalIncome || 0;
  const totalExpense = summary?.totalExpense || 0;
  const monthSurplus = Math.max(0, totalIncome - totalExpense);

  let essentialSpent = 0;
  let lifestyleSpent = 0;
  let savingsSpent   = 0;

  transactions.forEach((t) => {
    if (t.type === 'expense') {
      const pillar = classifyCategoryPillar(t.category_name, t.type);
      if (pillar === 'essential') essentialSpent += t.amount;
      else if (pillar === 'lifestyle') lifestyleSpent += t.amount;
      else savingsSpent += t.amount;
    }
  });

  // Metas percentuais
  const isRule503020 = ruleType === '50/30/20';
  const targetPct = isRule503020
    ? { essential: 0.50, lifestyle: 0.30, savings: 0.20 }
    : { essential: 0.70, lifestyle: 0.20, savings: 0.10 };

  const targetAmount = {
    essential: totalIncome * targetPct.essential,
    lifestyle: totalIncome * targetPct.lifestyle,
    savings:   totalIncome * targetPct.savings,
  };

  const actualPct = {
    essential: totalIncome > 0 ? (essentialSpent / totalIncome) * 100 : 0,
    lifestyle: totalIncome > 0 ? (lifestyleSpent / totalIncome) * 100 : 0,
    savings:   totalIncome > 0 ? ((monthSurplus + savingsSpent) / totalIncome) * 100 : 0,
  };

  return {
    totalIncome,
    totalExpense,
    monthSurplus,
    ruleType,
    targets: targetAmount,
    targetPct,
    actualSpent: {
      essential: essentialSpent,
      lifestyle: lifestyleSpent,
      savings: monthSurplus + savingsSpent,
    },
    actualPct,
  };
};

/**
 * Simula rendimento de juros compostos para aportes mensais.
 * @param {number} monthlyContribution - Aporte em R$ por mês
 * @param {number} years - Quantidade de anos (ex: 1, 5, 10)
 * @param {number} annualRate - Taxa anual (ex: 0.10 para 10% a.a.)
 * @param {number} initialAmount - Saldo inicial
 */
export const calculateCompoundInterest = (monthlyContribution, years, annualRate = 0.10, initialAmount = 0) => {
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  const totalMonths = years * 12;

  let totalBalance = initialAmount;
  let totalInvested = initialAmount;

  for (let m = 1; m <= totalMonths; m++) {
    totalBalance = (totalBalance + monthlyContribution) * (1 + monthlyRate);
    totalInvested += monthlyContribution;
  }

  const interestEarned = Math.max(0, totalBalance - totalInvested);

  return {
    years,
    totalInvested: Math.round(totalInvested * 100) / 100,
    interestEarned: Math.round(interestEarned * 100) / 100,
    totalBalance: Math.round(totalBalance * 100) / 100,
  };
};

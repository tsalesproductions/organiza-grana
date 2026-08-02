/**
 * OrganizaGrana — Serviço de Agregação de Contexto Financeiro
 * Compila dados anonimizados do SQLite para alimentar o assistente de IA.
 */
import { executeSql } from './db.js';
import { getCurrentMonthYear, navigateMonth } from '../utils/dates.js';
import { getUserConfig } from './user.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/**
 * Coleta o resumo financeiro atual e do mês anterior para contextualizar a IA.
 * @returns {Promise<Object>}
 */
export const getFinancialContextSummary = async () => {
  const { month, year } = getCurrentMonthYear();

  // Mês anterior para comparativo
  const { month: prevMonth, year: prevYear } = navigateMonth(month, year, -1);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const [
    userConfig,
    currentTotals,
    prevTotals,
    categoriesBreakdown,
    cardsData,
    recurringData,
  ] = await Promise.all([
    getUserConfig(),

    // Totais do mês atual
    executeSql(
      `SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS totalIncome,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS totalExpense,
        COUNT(*) AS totalCount
       FROM transactions
       WHERE strftime('%Y-%m', date) = ?`,
      [monthStr]
    ),

    // Totais do mês anterior
    executeSql(
      `SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS totalIncome,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS totalExpense
       FROM transactions
       WHERE strftime('%Y-%m', date) = ?`,
      [prevMonthStr]
    ),

    // Maiores gastos por categoria no mês atual
    executeSql(
      `SELECT c.name, c.icon, SUM(t.amount) AS total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ?
       GROUP BY t.category_id
       ORDER BY total DESC
       LIMIT 5`,
      [monthStr]
    ),

    // Cartões de crédito e limite
    executeSql('SELECT name, credit_limit, closing_day, due_day FROM cards', []),

    // Próximas despesas recorrentes
    executeSql(
      `SELECT description, amount, recurrence_type, date
       FROM transactions
       WHERE is_recurring = 1 AND type = 'expense'
       LIMIT 5`,
      []
    ),
  ]);

  const currInc = currentTotals.rows.item(0)?.totalIncome || 0;
  const currExp = currentTotals.rows.item(0)?.totalExpense || 0;
  const currBal = currInc - currExp;

  const prevInc = prevTotals.rows.item(0)?.totalIncome || 0;
  const prevExp = prevTotals.rows.item(0)?.totalExpense || 0;
  const prevBal = prevInc - prevExp;

  const categories = rowsToArray(categoriesBreakdown.rows);
  const cards = rowsToArray(cardsData.rows);
  const recurring = rowsToArray(recurringData.rows);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return {
    userName: userConfig?.name || 'Usuário',
    currentMonthName: `${monthNames[month - 1]} de ${year}`,
    balance: currBal,
    totalIncome: currInc,
    totalExpense: currExp,
    prevMonthName: `${monthNames[prevMonth - 1]} de ${prevYear}`,
    prevTotalIncome: prevInc,
    prevTotalExpense: prevExp,
    prevBalance: prevBal,
    categories,
    cards,
    recurring,
  };
};

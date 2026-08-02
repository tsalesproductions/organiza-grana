/**
 * OrganizaGrana — Serviço de Tetos Orçamentários (Budgets)
 * Gerencia limites de gastos por categoria e calculo de consumo.
 */
import { executeSql } from './db.js';
import { getCurrentMonthYear } from '../utils/dates.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/**
 * Atualiza o teto orçamentário de uma categoria.
 * @param {number} categoryId
 * @param {number} limitAmount
 */
export const updateCategoryBudget = async (categoryId, limitAmount) => {
  const amount = Math.max(0, Number(limitAmount) || 0);
  await executeSql('UPDATE categories SET budget_limit = ? WHERE id = ?', [amount, categoryId]);
};

/**
 * Busca todas as categorias de despesa com seus respectivos gastos acumulados no mês e cálculo do teto.
 * @param {number} [month]
 * @param {number} [year]
 * @returns {Promise<Array>}
 */
export const getCategoryBudgets = async (month, year) => {
  const m = month || getCurrentMonthYear().month;
  const y = year || getCurrentMonthYear().year;
  const monthStr = `${y}-${String(m).padStart(2, '0')}`;

  const result = await executeSql(
    `SELECT c.id, c.name, c.icon, c.color, c.budget_limit,
            COALESCE(SUM(t.amount), 0) AS current_spent
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id
          AND t.type = 'expense'
          AND strftime('%Y-%m', t.date) = ?
     WHERE c.type = 'expense'
     GROUP BY c.id
     ORDER BY c.budget_limit DESC, current_spent DESC`,
    [monthStr]
  );

  const categories = rowsToArray(result.rows);

  return categories.map((cat) => {
    const limit = cat.budget_limit || 0;
    const spent = cat.current_spent || 0;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    let status = 'none';
    if (limit > 0) {
      if (percentage >= 90) status = 'red';
      else if (percentage >= 70) status = 'yellow';
      else status = 'green';
    }

    return {
      ...cat,
      budget_limit: limit,
      current_spent: spent,
      percentage: Math.min(100, Math.round(percentage)),
      real_percentage: Math.round(percentage),
      status,
    };
  });
};

/**
 * Verifica se a inclusão de uma despesa ultrapassa o teto da categoria (para toast de aviso).
 */
export const checkBudgetAlert = async (categoryId, newExpenseAmount) => {
  if (!categoryId) return null;
  const { month, year } = getCurrentMonthYear();
  const budgets = await getCategoryBudgets(month, year);
  const target = budgets.find((b) => Number(b.id) === Number(categoryId));

  if (!target || target.budget_limit <= 0) return null;

  const totalAfter = target.current_spent + Number(newExpenseAmount || 0);
  const pctAfter = (totalAfter / target.budget_limit) * 100;

  if (pctAfter >= 100) {
    return {
      type: 'exceeded',
      categoryName: target.name,
      percentage: Math.round(pctAfter),
    };
  } else if (pctAfter >= 80) {
    return {
      type: 'warning',
      categoryName: target.name,
      percentage: Math.round(pctAfter),
    };
  }

  return null;
};

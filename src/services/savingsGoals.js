/**
 * OrganizaGrana — Serviço de Metas Financeiras / Caixinhas
 */
import { executeSql } from './db.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/** Lista todas as metas de economia */
export const getAllGoals = async () => {
  const result = await executeSql(
    'SELECT * FROM savings_goals ORDER BY created_at DESC', []
  );
  return rowsToArray(result.rows);
};

/** Cria uma nova meta */
export const createGoal = async ({ title, target_amount, initial_amount = 0, color = '#6C5CE7', category = 'Geral' }) => {
  const target = Math.max(1, parseFloat(target_amount) || 0);
  const current = Math.max(0, parseFloat(initial_amount) || 0);

  const result = await executeSql(
    `INSERT INTO savings_goals (title, target_amount, current_amount, color, category)
     VALUES (?, ?, ?, ?, ?)`,
    [title.trim(), target, current, color, category]
  );
  return result.insertId;
};

/** Adiciona valor à meta (depósito) */
export const depositToGoal = async (id, amount) => {
  const val = Math.max(0, parseFloat(amount) || 0);
  await executeSql(
    'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?',
    [val, id]
  );
};

/** Resgata valor da meta */
export const withdrawFromGoal = async (id, amount) => {
  const val = Math.max(0, parseFloat(amount) || 0);
  await executeSql(
    'UPDATE savings_goals SET current_amount = MAX(0, current_amount - ?) WHERE id = ?',
    [val, id]
  );
};

/** Exclui uma meta */
export const deleteGoal = async (id) => {
  await executeSql('DELETE FROM savings_goals WHERE id = ?', [id]);
};


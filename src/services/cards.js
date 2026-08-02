/**
 * OrganizaGrana — Serviço de Cartões de Crédito
 */
import { executeSql } from './db.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/** Lista todos os cartões */
export const getAllCards = async () => {
  const result = await executeSql(
    'SELECT * FROM cards ORDER BY created_at ASC', []
  );
  return rowsToArray(result.rows);
};

/** Busca um cartão por ID */
export const getCardById = async (id) => {
  const result = await executeSql('SELECT * FROM cards WHERE id=?', [id]);
  return result.rows.length > 0 ? result.rows.item(0) : null;
};

/** Cria um novo cartão */
export const createCard = async ({ name, last_digits, closing_day, due_day, credit_limit, color }) => {
  const result = await executeSql(
    `INSERT INTO cards (name, last_digits, closing_day, due_day, credit_limit, color)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, last_digits, closing_day, due_day, credit_limit || 0, color || '#6C5CE7']
  );
  return result.insertId;
};

/** Atualiza um cartão existente */
export const updateCard = async (id, { name, last_digits, closing_day, due_day, credit_limit, color }) => {
  await executeSql(
    `UPDATE cards SET name=?, last_digits=?, closing_day=?, due_day=?, credit_limit=?, color=?
     WHERE id=?`,
    [name, last_digits, closing_day, due_day, credit_limit || 0, color || '#6C5CE7', id]
  );
};

/** Remove um cartão e define as transações vinculadas como cash */
export const deleteCard = async (id) => {
  await executeSql(
    `UPDATE transactions SET card_id=NULL, payment_method='cash' WHERE card_id=?`, [id]
  );
  await executeSql('DELETE FROM cards WHERE id=?', [id]);
};

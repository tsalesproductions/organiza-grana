/**
 * OrganizaGrana — Serviço de Listas de Compras
 * CRUD completo de listas de compras e seus itens com recálculo automático.
 */
import { executeSql } from './db.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/** Lista todas as listas de compras com contagem de itens e status */
export const getAllShoppingLists = async () => {
  const result = await executeSql(
    `SELECT l.*,
            (SELECT COUNT(*) FROM shopping_list_items WHERE list_id = l.id) AS total_items,
            (SELECT COUNT(*) FROM shopping_list_items WHERE list_id = l.id AND is_checked = 1) AS checked_items
     FROM shopping_lists l
     ORDER BY l.status ASC, l.created_at DESC`,
    []
  );
  return rowsToArray(result.rows);
};

/** Busca uma lista por ID com estatísticas */
export const getShoppingListById = async (listId) => {
  const result = await executeSql(
    `SELECT l.*,
            (SELECT COUNT(*) FROM shopping_list_items WHERE list_id = l.id) AS total_items,
            (SELECT COUNT(*) FROM shopping_list_items WHERE list_id = l.id AND is_checked = 1) AS checked_items
     FROM shopping_lists l WHERE l.id=?`,
    [listId]
  );
  return result.rows.length > 0 ? result.rows.item(0) : null;
};

/** Cria uma nova lista de compras */
export const createShoppingList = async (name) => {
  const result = await executeSql(
    'INSERT INTO shopping_lists (name, status, total_amount) VALUES (?, "active", 0)',
    [name.trim()]
  );
  return result.insertId;
};

/** Atualiza status ou dados de uma lista */
export const updateShoppingList = async (listId, data) => {
  const fields = [];
  const params = [];

  if (data.name !== undefined) { fields.push('name=?'); params.push(data.name.trim()); }
  if (data.status !== undefined) { fields.push('status=?'); params.push(data.status); }
  if (data.total_amount !== undefined) { fields.push('total_amount=?'); params.push(data.total_amount); }

  if (!fields.length) return;
  params.push(listId);

  await executeSql(`UPDATE shopping_lists SET ${fields.join(', ')} WHERE id=?`, params);
};

/** Exclui uma lista e seus itens */
export const deleteShoppingList = async (listId) => {
  await executeSql('DELETE FROM shopping_list_items WHERE list_id=?', [listId]);
  await executeSql('DELETE FROM shopping_lists WHERE id=?', [listId]);
};

/** Busca itens de uma lista */
export const getShoppingListItems = async (listId) => {
  const result = await executeSql(
    'SELECT * FROM shopping_list_items WHERE list_id=? ORDER BY is_checked ASC, id ASC',
    [listId]
  );
  return rowsToArray(result.rows);
};

/** Recalcula e atualiza o valor total acumulado de uma lista (apenas itens marcados) */
export const recalculateListTotal = async (listId) => {
  const items = await getShoppingListItems(listId);
  const total = items.reduce((sum, item) => {
    return item.is_checked === 1 ? sum + (item.quantity * item.unit_price) : sum;
  }, 0);

  await executeSql('UPDATE shopping_lists SET total_amount=? WHERE id=?', [total, listId]);
  return total;
};

/** Adiciona um item à lista */
export const addShoppingListItem = async (listId, name, quantity = 1, unitPrice = 0) => {
  const result = await executeSql(
    'INSERT INTO shopping_list_items (list_id, name, quantity, unit_price, is_checked) VALUES (?, ?, ?, ?, 0)',
    [listId, name.trim(), Math.max(1, parseInt(quantity) || 1), Math.max(0, parseFloat(unitPrice) || 0)]
  );
  await recalculateListTotal(listId);
  return result.insertId;
};

/** Atualiza um item da lista */
export const updateShoppingListItem = async (itemId, listId, data) => {
  const fields = [];
  const params = [];

  if (data.name !== undefined) { fields.push('name=?'); params.push(data.name.trim()); }
  if (data.quantity !== undefined) { fields.push('quantity=?'); params.push(Math.max(1, parseInt(data.quantity) || 1)); }
  if (data.unit_price !== undefined) { fields.push('unit_price=?'); params.push(Math.max(0, parseFloat(data.unit_price) || 0)); }
  if (data.is_checked !== undefined) { fields.push('is_checked=?'); params.push(data.is_checked ? 1 : 0); }

  if (!fields.length) return;
  params.push(itemId);

  await executeSql(`UPDATE shopping_list_items SET ${fields.join(', ')} WHERE id=?`, params);
  await recalculateListTotal(listId);
};

/** Remove um item */
export const deleteShoppingListItem = async (itemId, listId) => {
  await executeSql('DELETE FROM shopping_list_items WHERE id=?', [itemId]);
  await recalculateListTotal(listId);
};

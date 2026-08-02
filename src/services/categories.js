/**
 * OrganizaGrana — Serviço de Categorias
 */
import { executeSql } from './db.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/** Lista todas as categorias, opcionalmente filtradas por tipo */
export const getAllCategories = async (type = null) => {
  const sql = type
    ? 'SELECT * FROM categories WHERE type=? ORDER BY is_default DESC, name ASC'
    : 'SELECT * FROM categories ORDER BY type ASC, is_default DESC, name ASC';
  const params = type ? [type] : [];
  const result = await executeSql(sql, params);
  return rowsToArray(result.rows);
};

/** Cria uma nova categoria */
export const createCategory = async ({ name, icon, color, type }) => {
  const result = await executeSql(
    'INSERT INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?)',
    [name, icon, color, type]
  );
  return result.insertId;
};

/** Atualiza uma categoria */
export const updateCategory = async (id, { name, icon, color }) => {
  await executeSql(
    'UPDATE categories SET name=?, icon=?, color=? WHERE id=?',
    [name, icon, color, id]
  );
};

/** Remove uma categoria (somente se não for padrão) */
export const deleteCategory = async (id) => {
  const result = await executeSql('SELECT is_default FROM categories WHERE id=?', [id]);
  if (result.rows.item(0)?.is_default === 1) {
    throw new Error('Categorias padrão não podem ser excluídas.');
  }
  // Zera a categoria nas transações vinculadas
  await executeSql('UPDATE transactions SET category_id=NULL WHERE category_id=?', [id]);
  await executeSql('DELETE FROM categories WHERE id=?', [id]);
};

/** Ícones disponíveis para seleção */
export const AVAILABLE_ICONS = [
  '🍔','🍕','🍜','☕','🛒','🚗','🚌','✈️','🏠','💊',
  '📚','🎬','🎮','👕','👟','💍','💼','💻','📱','🎵',
  '🏋️','⚽','🌴','🎁','🐾','🛠️','💡','📌','🔑','✨',
  '📈','💰','🏦','💳','🌡️','🎓','🏥','🌿','🎨','🔧',
];

/** Paleta de cores para categorias */
export const CATEGORY_COLORS = [
  '#E17055','#FDCB6E','#00B894','#00CEC9','#6C5CE7',
  '#A29BFE','#FD79A8','#74B9FF','#55EFC4','#81ECEC',
  '#FF7675','#B2BEC3','#636E72','#2D3436','#0984E3',
];

/**
 * OrganizaGrana — Serviço de Backup e Restauração de Dados
 * Permite exportar o banco de dados em JSON e restaurar em qualquer celular.
 */
import { executeSql, executeTransaction } from './db.js';
import { downloadOrShareFile } from './exportService.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/**
 * Exporta todo o banco de dados SQLite para um arquivo JSON baixável ou compartilhável.
 */
export const exportDatabaseBackup = async () => {
  const [user, categories, cards, transactions, shoppingLists, shoppingItems, notifConfig] =
    await Promise.all([
      executeSql('SELECT * FROM user_config', []).then((r) => rowsToArray(r.rows)),
      executeSql('SELECT * FROM categories', []).then((r) => rowsToArray(r.rows)),
      executeSql('SELECT * FROM cards', []).then((r) => rowsToArray(r.rows)),
      executeSql('SELECT * FROM transactions', []).then((r) => rowsToArray(r.rows)),
      executeSql('SELECT * FROM shopping_lists', []).then((r) => rowsToArray(r.rows)),
      executeSql('SELECT * FROM shopping_list_items', []).then((r) => rowsToArray(r.rows)),
      executeSql('SELECT * FROM notification_config', []).then((r) => rowsToArray(r.rows)),
    ]);

  const backupData = {
    app: 'OrganizaGrana',
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    data: {
      user_config: user,
      categories,
      cards,
      transactions,
      shopping_lists: shoppingLists,
      shopping_list_items: shoppingItems,
      notification_config: notifConfig,
    },
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Backup_OrganizaGrana_${dateStr}.json`;

  await downloadOrShareFile(jsonStr, fileName, 'application/json');
  return jsonStr;
};

/**
 * Restaura o banco de dados a partir de uma string JSON de backup.
 * @param {string} jsonContent - Conteúdo do arquivo de backup em texto JSON
 */
export const importDatabaseBackup = async (jsonContent) => {
  let parsed = null;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err) {
    throw new Error('Arquivo de backup inválido (formato JSON incorreto).');
  }

  if (!parsed || parsed.app !== 'OrganizaGrana' || !parsed.data) {
    throw new Error('O arquivo selecionado não é um backup válido do OrganizaGrana.');
  }

  const { data } = parsed;

  const queries = [
    // 1. Limpa tabelas existentes
    { sql: 'DELETE FROM shopping_list_items' },
    { sql: 'DELETE FROM shopping_lists' },
    { sql: 'DELETE FROM transactions' },
    { sql: 'DELETE FROM cards' },
    { sql: 'DELETE FROM categories' },
    { sql: 'DELETE FROM user_config' },
    { sql: 'DELETE FROM notification_config' },
  ];

  // 2. Insere dados de user_config
  if (data.user_config && data.user_config.length) {
    data.user_config.forEach((u) => {
      queries.push({
        sql: 'INSERT INTO user_config (id, name, email, gpt_enabled, gpt_api_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [u.id, u.name, u.email, u.gpt_enabled || 0, u.gpt_api_key || '', u.created_at],
      });
    });
  }

  // 3. Insere categorias
  if (data.categories && data.categories.length) {
    data.categories.forEach((c) => {
      queries.push({
        sql: 'INSERT INTO categories (id, name, icon, color, type, is_default, budget_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [c.id, c.name, c.icon, c.color, c.type, c.is_default || 0, c.budget_limit || 0],
      });
    });
  }

  // 4. Insere cartões
  if (data.cards && data.cards.length) {
    data.cards.forEach((c) => {
      queries.push({
        sql: 'INSERT INTO cards (id, name, last_digits, closing_day, due_day, credit_limit, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        params: [c.id, c.name, c.last_digits, c.closing_day, c.due_day, c.credit_limit || 0, c.color, c.created_at],
      });
    });
  }

  // 5. Insere transações
  if (data.transactions && data.transactions.length) {
    data.transactions.forEach((t) => {
      queries.push({
        sql: 'INSERT INTO transactions (id, description, amount, type, category_id, card_id, date, is_recurring, recurrence_type, installments_count, installment_number, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [
          t.id, t.description, t.amount, t.type, t.category_id, t.card_id, t.date,
          t.is_recurring || 0, t.recurrence_type, t.installments_count, t.installment_number, t.is_paid || 1
        ],
      });
    });
  }

  // 6. Insere listas de compras
  if (data.shopping_lists && data.shopping_lists.length) {
    data.shopping_lists.forEach((l) => {
      queries.push({
        sql: 'INSERT INTO shopping_lists (id, name, created_at, status, total_amount) VALUES (?, ?, ?, ?, ?)',
        params: [l.id, l.name, l.created_at, l.status, l.total_amount || 0],
      });
    });
  }

  // 7. Insere itens de listas de compras
  if (data.shopping_list_items && data.shopping_list_items.length) {
    data.shopping_list_items.forEach((i) => {
      queries.push({
        sql: 'INSERT INTO shopping_list_items (id, list_id, name, quantity, unit_price, is_checked) VALUES (?, ?, ?, ?, ?, ?)',
        params: [i.id, i.list_id, i.name, i.quantity || 1, i.unit_price || 0, i.is_checked || 0],
      });
    });
  }

  // Executa toda a restauração dentro de uma única transação SQLite
  await executeTransaction(queries);
};

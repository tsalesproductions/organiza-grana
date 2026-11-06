/**
 * OrganizaGrana — Serviço de Backup e Restauração de Dados
 * Permite exportar o banco de dados em JSON e restaurar com total fidelidade.
 */
import { executeSql, executeTransaction } from './db.js';
import { downloadOrShareFile } from './exportService.js';
import { getAppVersion } from './updateService.js';

const rowsToArray = (rows) => {
  const arr = [];
  if (!rows) return arr;
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/**
 * Exporta todo o banco de dados SQLite para um arquivo JSON baixável ou compartilhável.
 */
export const exportDatabaseBackup = async () => {
  const [user, categories, cards, transactions, shoppingLists, shoppingItems, notifConfig, savingsGoals] =
    await Promise.all([
      executeSql('SELECT * FROM user_config', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM categories', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM cards', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM transactions', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM shopping_lists', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM shopping_list_items', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM notification_config', []).then((r) => rowsToArray(r.rows)).catch(() => []),
      executeSql('SELECT * FROM savings_goals', []).then((r) => rowsToArray(r.rows)).catch(() => []),
    ]);

  const currentVersion = await getAppVersion();

  const backupData = {
    app: 'OrganizaGrana',
    version: currentVersion,
    exported_at: new Date().toISOString(),
    data: {
      user_config: user,
      categories,
      cards,
      transactions,
      shopping_lists: shoppingLists,
      shopping_list_items: shoppingItems,
      notification_config: notifConfig,
      savings_goals: savingsGoals,
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
 * Compatível tanto com exportações novas quanto com backups de versões anteriores.
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
    // 1. Limpa tabelas existentes na ordem reversa de chaves estrangeiras
    { sql: 'DELETE FROM shopping_list_items' },
    { sql: 'DELETE FROM shopping_lists' },
    { sql: 'DELETE FROM transactions' },
    { sql: 'DELETE FROM cards' },
    { sql: 'DELETE FROM categories' },
    { sql: 'DELETE FROM user_config' },
    { sql: 'DELETE FROM notification_config' },
  ];

  // Adiciona limpeza de savings_goals se tabela existir
  try {
    queries.push({ sql: 'DELETE FROM savings_goals' });
  } catch (_) {}

  // 2. Insere dados de user_config
  if (Array.isArray(data.user_config) && data.user_config.length) {
    data.user_config.forEach((u) => {
      queries.push({
        sql: 'INSERT INTO user_config (id, name, email, gpt_enabled, gpt_api_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [u.id || 1, u.name || '', u.email || '', u.gpt_enabled ? 1 : 0, u.gpt_api_key || '', u.created_at || new Date().toISOString()],
      });
    });
  }

  // 3. Insere categorias
  if (Array.isArray(data.categories) && data.categories.length) {
    data.categories.forEach((c) => {
      queries.push({
        sql: 'INSERT INTO categories (id, name, icon, color, type, is_default, budget_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [c.id, c.name, c.icon, c.color, c.type, c.is_default || 0, c.budget_limit || 0],
      });
    });
  }

  // 4. Insere cartões
  if (Array.isArray(data.cards) && data.cards.length) {
    data.cards.forEach((c) => {
      queries.push({
        sql: 'INSERT INTO cards (id, name, last_digits, closing_day, due_day, credit_limit, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        params: [c.id, c.name, c.last_digits, c.closing_day, c.due_day, c.credit_limit || 0, c.color || '#6C5CE7', c.created_at || new Date().toISOString()],
      });
    });
  }

  // 5. Insere transações (com retrocompatibilidade total de colunas)
  if (Array.isArray(data.transactions) && data.transactions.length) {
    data.transactions.forEach((t) => {
      const paymentMethod = t.payment_method || (t.card_id ? 'credit_card' : 'cash');
      const installmentTotal = t.installment_total != null ? t.installment_total : (t.installments_count != null ? t.installments_count : null);
      const installmentCurrent = t.installment_current != null ? t.installment_current : (t.installment_number != null ? t.installment_number : null);
      const status = t.status || (t.is_paid === 0 ? 'pending' : 'paid');

      queries.push({
        sql: `INSERT INTO transactions 
              (id, description, amount, type, payment_method, card_id, category_id, date, 
               is_recurring, recurrence_type, installment_total, installment_current, 
               installment_group_id, notes, payment_code, status, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          t.id,
          t.description,
          Number(t.amount) || 0,
          t.type || 'expense',
          paymentMethod,
          t.card_id || null,
          t.category_id || null,
          t.date,
          t.is_recurring ? 1 : 0,
          t.recurrence_type || null,
          installmentTotal,
          installmentCurrent,
          t.installment_group_id || null,
          t.notes || null,
          t.payment_code || null,
          status,
          t.created_at || new Date().toISOString(),
        ],
      });
    });
  }

  // 6. Insere listas de compras
  if (Array.isArray(data.shopping_lists) && data.shopping_lists.length) {
    data.shopping_lists.forEach((l) => {
      queries.push({
        sql: 'INSERT INTO shopping_lists (id, name, created_at, status, total_amount) VALUES (?, ?, ?, ?, ?)',
        params: [l.id, l.name, l.created_at || new Date().toISOString(), l.status || 'active', Number(l.total_amount) || 0],
      });
    });
  }

  // 7. Insere itens de listas de compras
  if (Array.isArray(data.shopping_list_items) && data.shopping_list_items.length) {
    data.shopping_list_items.forEach((i) => {
      queries.push({
        sql: 'INSERT INTO shopping_list_items (id, list_id, name, quantity, unit_price, is_checked) VALUES (?, ?, ?, ?, ?, ?)',
        params: [i.id, i.list_id, i.name, i.quantity || 1, Number(i.unit_price) || 0, i.is_checked ? 1 : 0],
      });
    });
  }

  // 8. Insere notificações
  if (Array.isArray(data.notification_config) && data.notification_config.length) {
    data.notification_config.forEach((n) => {
      queries.push({
        sql: 'INSERT INTO notification_config (id, type, enabled, days_before, time) VALUES (?, ?, ?, ?, ?)',
        params: [n.id, n.type, n.enabled != null ? n.enabled : 1, n.days_before || 3, n.time || '09:00'],
      });
    });
  }

  // 9. Insere metas financeiras / caixinhas (se houver no backup)
  if (Array.isArray(data.savings_goals) && data.savings_goals.length) {
    data.savings_goals.forEach((g) => {
      queries.push({
        sql: 'INSERT INTO savings_goals (id, title, target_amount, current_amount, color, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [g.id, g.title, Number(g.target_amount) || 0, Number(g.current_amount) || 0, g.color || '#6C5CE7', g.category || 'Geral', g.created_at || new Date().toISOString()],
      });
    });
  }

  // Executa toda a restauração dentro de uma única transação SQLite
  await executeTransaction(queries);
};

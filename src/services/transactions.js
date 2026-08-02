/**
 * OrganizaGrana — Serviço de Transações
 * CRUD completo de receitas e despesas com suporte a parcelas e recorrência.
 */
import { executeSql, executeTransaction } from './db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Busca todas as transações de um período (mês/ano).
 * @param {number} month - 1-12
 * @param {number} year  - ex: 2026
 * @returns {Promise<Array>}
 */
export const getTransactionsByMonth = async (month, year) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;

  const result = await executeSql(
    `SELECT t.*,
            c.name  AS category_name,
            c.icon  AS category_icon,
            c.color AS category_color,
            ca.name AS card_name
     FROM transactions t
     LEFT JOIN categories c  ON t.category_id = c.id
     LEFT JOIN cards      ca ON t.card_id = ca.id
     WHERE t.date BETWEEN ? AND ?
     ORDER BY t.date DESC, t.created_at DESC`,
    [startDate, endDate]
  );

  return rowsToArray(result.rows);
};

/**
 * Busca transações vinculadas a um cartão para o ciclo de fatura atual.
 * @param {number} cardId
 * @param {number} closingDay - dia de fechamento do cartão
 * @returns {Promise<Array>}
 */
export const getCardTransactions = async (cardId, closingDay) => {
  const today = new Date();
  let cycleStart, cycleEnd;

  // Calcula o início e fim do ciclo de fatura atual
  if (today.getDate() <= closingDay) {
    // Antes do fechamento: ciclo do mês anterior ao atual
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, closingDay + 1);
    cycleStart = formatDate(prevMonth);
    cycleEnd   = formatDate(new Date(today.getFullYear(), today.getMonth(), closingDay));
  } else {
    // Após o fechamento: ciclo do mês atual ao próximo
    cycleStart = formatDate(new Date(today.getFullYear(), today.getMonth(), closingDay + 1));
    cycleEnd   = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, closingDay));
  }

  const result = await executeSql(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.card_id = ? AND t.date BETWEEN ? AND ?
     ORDER BY t.date DESC`,
    [cardId, cycleStart, cycleEnd]
  );

  return rowsToArray(result.rows);
};

/**
 * Calcula o saldo total da fatura de um cartão no ciclo atual.
 */
export const getCardInvoiceTotal = async (cardId, closingDay) => {
  const transactions = await getCardTransactions(cardId, closingDay);
  return transactions.reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Busca o balanço do mês (total receitas, despesas à vista, despesas cartão).
 */
export const getMonthSummary = async (month, year) => {
  const transactions = await getTransactionsByMonth(month, year);

  const summary = {
    totalIncome:       0,
    totalExpenseCash:  0,
    totalExpenseCard:  0,
    totalExpense:      0,
    balance:           0,
  };

  transactions.forEach((t) => {
    if (t.type === 'income') {
      summary.totalIncome += t.amount;
    } else {
      summary.totalExpense += t.amount;
      if (t.payment_method === 'cash') {
        summary.totalExpenseCash += t.amount;
      } else {
        summary.totalExpenseCard += t.amount;
      }
    }
  });

  summary.balance = summary.totalIncome - summary.totalExpense;
  return summary;
};

/**
 * Cria uma nova transação.
 * Se for parcelada, cria N transações com o mesmo installment_group_id.
 * Se for recorrente mensal, cria N meses de transações.
 * @param {Object} data - dados da transação
 */
export const createTransaction = async (data) => {
  const {
    description, amount, type, payment_method, card_id,
    category_id, date, is_recurring, recurrence_type,
    installment_total, installment_months, notes,
  } = data;

  // Caso 1: parcelado
  if (recurrence_type === 'installment' && installment_total > 1) {
    const groupId = uuidv4();
    const baseDate = new Date(date + 'T12:00:00');
    const queries = [];

    for (let i = 0; i < installment_total; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(installmentDate.getMonth() + i);

      queries.push({
        sql: `INSERT INTO transactions
              (description, amount, type, payment_method, card_id, category_id, date,
               is_recurring, recurrence_type, installment_total, installment_current,
               installment_group_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'installment', ?, ?, ?, ?)`,
        params: [
          `${description} (${i + 1}/${installment_total})`,
          amount / installment_total,
          type, payment_method, card_id || null, category_id || null,
          formatDate(installmentDate), installment_total, i + 1, groupId, notes || null,
        ],
      });
    }

    await executeTransaction(queries);
    return;
  }

  // Caso 2: recorrente mensal
  if (is_recurring && recurrence_type === 'monthly' && installment_months > 1) {
    const groupId = uuidv4();
    const baseDate = new Date(date + 'T12:00:00');
    const queries = [];

    for (let i = 0; i < installment_months; i++) {
      const recurringDate = new Date(baseDate);
      recurringDate.setMonth(recurringDate.getMonth() + i);

      queries.push({
        sql: `INSERT INTO transactions
              (description, amount, type, payment_method, card_id, category_id, date,
               is_recurring, recurrence_type, installment_total, installment_current,
               installment_group_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'monthly', ?, ?, ?, ?)`,
        params: [
          description, amount, type, payment_method,
          card_id || null, category_id || null, formatDate(recurringDate),
          installment_months, i + 1, groupId, notes || null,
        ],
      });
    }

    await executeTransaction(queries);
    return;
  }

  // Caso 3: transação simples
  await executeSql(
    `INSERT INTO transactions
     (description, amount, type, payment_method, card_id, category_id, date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [description, amount, type, payment_method,
     card_id || null, category_id || null, date, notes || null]
  );
};

/**
 * Atualiza uma transação existente.
 */
export const updateTransaction = async (id, data) => {
  const { description, amount, type, payment_method, card_id, category_id, date, notes } = data;
  await executeSql(
    `UPDATE transactions
     SET description=?, amount=?, type=?, payment_method=?, card_id=?,
         category_id=?, date=?, notes=?
     WHERE id=?`,
    [description, amount, type, payment_method,
     card_id || null, category_id || null, date, notes || null, id]
  );
};

/**
 * Remove uma transação (e suas parcelas se for parcelada).
 */
export const deleteTransaction = async (id, deleteGroup = false) => {
  if (deleteGroup) {
    const t = await executeSql('SELECT installment_group_id FROM transactions WHERE id=?', [id]);
    const groupId = t.rows.item(0)?.installment_group_id;
    if (groupId) {
      await executeSql('DELETE FROM transactions WHERE installment_group_id=?', [groupId]);
      return;
    }
  }
  await executeSql('DELETE FROM transactions WHERE id=?', [id]);
};

/**
 * Busca dados para o gráfico de pizza por categoria.
 */
export const getExpensesByCategory = async (month, year) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;

  const result = await executeSql(
    `SELECT c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
            SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type='expense' AND t.date BETWEEN ? AND ?
     GROUP BY t.category_id
     ORDER BY total DESC`,
    [startDate, endDate]
  );

  return rowsToArray(result.rows);
};

/**
 * Busca os últimos N lançamentos para o dashboard.
 */
export const getRecentTransactions = async (limit = 5) => {
  const result = await executeSql(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rowsToArray(result.rows);
};

/**
 * Busca resumo mensal dos últimos N meses para gráfico de barras.
 */
export const getMonthlyHistory = async (months = 6) => {
  const result = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const summary = await getMonthSummary(d.getMonth() + 1, d.getFullYear());
    result.push({
      month: d.toLocaleDateString('pt-BR', { month: 'short' }),
      income: summary.totalIncome,
      expense: summary.totalExpense,
    });
  }

  return result;
};

// ---- Helpers ----
const formatDate = (date) => date.toISOString().split('T')[0];

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

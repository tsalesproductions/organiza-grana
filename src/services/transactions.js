/**
 * OrganizaGrana — Serviço de Transações
 * CRUD completo de receitas e despesas com suporte a parcelas e recorrência.
 */
import { executeSql, executeTransaction } from './db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Garante que lançamentos recorrentes por tempo indeterminado estejam gerados
 * até o mês/ano solicitado (e com projeção de 12 meses à frente).
 * @param {number} month - 1-12
 * @param {number} year - ex: 2026
 */
export const ensureIndefiniteRecurrencesUpTo = async (month, year) => {
  const targetDateStr = `${year}-${String(month).padStart(2, '0')}-28`;

  // Busca todos os grupos únicos de recorrência por tempo indeterminado
  const result = await executeSql(
    `SELECT DISTINCT installment_group_id, description, amount, type, payment_method, 
                     card_id, category_id, notes
     FROM transactions
     WHERE recurrence_type = 'monthly_indefinite' AND installment_group_id IS NOT NULL`,
    []
  );

  const groups = rowsToArray(result.rows);
  if (groups.length === 0) return;

  const queries = [];

  for (const g of groups) {
    // Busca a maior data já gerada para esse grupo
    const lastRes = await executeSql(
      `SELECT MAX(date) as max_date, COUNT(*) as current_count
       FROM transactions
       WHERE installment_group_id = ?`,
      [g.installment_group_id]
    );

    const maxDateStr = lastRes.rows.item(0)?.max_date;
    let currentCount = lastRes.rows.item(0)?.current_count || 0;

    if (!maxDateStr) continue;

    let lastDate = new Date(maxDateStr + 'T12:00:00');
    const targetDate = new Date(targetDateStr + 'T12:00:00');
    // Queremos manter projeção de até 12 meses além do mês visualizado
    targetDate.setMonth(targetDate.getMonth() + 12);

    while (lastDate < targetDate) {
      lastDate.setMonth(lastDate.getMonth() + 1);
      currentCount++;

      queries.push({
        sql: `INSERT INTO transactions
              (description, amount, type, payment_method, card_id, category_id, date,
               is_recurring, recurrence_type, installment_total, installment_current,
               installment_group_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'monthly_indefinite', NULL, ?, ?, ?)`,
        params: [
          g.description,
          g.amount,
          g.type,
          g.payment_method,
          g.card_id || null,
          g.category_id || null,
          formatDate(lastDate),
          currentCount,
          g.installment_group_id,
          g.notes || null,
        ],
      });
    }
  }

  if (queries.length > 0) {
    await executeTransaction(queries);
    console.log(`[DB] Gerados ${queries.length} lançamentos recorrentes adicionais.`);
  }
};

/**
 * Busca todas as transações de um período (mês/ano).
 * @param {number} month - 1-12
 * @param {number} year  - ex: 2026
 * @returns {Promise<Array>}
 */
export const getTransactionsByMonth = async (month, year) => {
  // Auto-projeta lançamentos recorrentes por tempo indeterminado se necessário
  await ensureIndefiniteRecurrencesUpTo(month, year);

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

  if (today.getDate() <= closingDay) {
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, closingDay + 1);
    cycleStart = formatDate(prevMonth);
    cycleEnd   = formatDate(new Date(today.getFullYear(), today.getMonth(), closingDay));
  } else {
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
 * Cria uma nova transação (Receita ou Despesa).
 * Suporta: Único, Parcelado, Recorrente Tempo Indeterminado e Recorrente Prazo Fixo.
 * @param {Object} data - dados da transação
 */
export const createTransaction = async (data) => {
  const {
    description, amount, type, payment_method, card_id,
    category_id, date, is_recurring, recurrence_type,
    installment_total, installment_months, notes,
  } = data;

  // Caso 1: Parcelado (installment) -> Ex: 10x de R$ 100
  if (recurrence_type === 'installment' && installment_total > 1) {
    const groupId = uuidv4();
    const baseDate = new Date(date + 'T12:00:00');
    const queries = [];
    const monthlyAmount = amount / installment_total;

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
          monthlyAmount,
          type, payment_method, card_id || null, category_id || null,
          formatDate(installmentDate), installment_total, i + 1, groupId, notes || null,
        ],
      });
    }

    await executeTransaction(queries);
    return;
  }

  // Caso 2: Recorrente por Tempo Indeterminado (monthly_indefinite) -> Ex: Salário, Aluguel
  if (recurrence_type === 'monthly_indefinite') {
    const groupId = uuidv4();
    const baseDate = new Date(date + 'T12:00:00');
    const queries = [];
    // Gera inicialmente 24 meses
    const initialMonths = 24;

    for (let i = 0; i < initialMonths; i++) {
      const recurringDate = new Date(baseDate);
      recurringDate.setMonth(recurringDate.getMonth() + i);

      queries.push({
        sql: `INSERT INTO transactions
              (description, amount, type, payment_method, card_id, category_id, date,
               is_recurring, recurrence_type, installment_total, installment_current,
               installment_group_id, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'monthly_indefinite', NULL, ?, ?, ?)`,
        params: [
          description,
          amount,
          type, payment_method, card_id || null, category_id || null,
          formatDate(recurringDate), i + 1, groupId, notes || null,
        ],
      });
    }

    await executeTransaction(queries);
    return;
  }

  // Caso 3: Recorrente com Prazo Determinado (monthly) -> Ex: 6 meses
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
          `${description} (${i + 1}/${installment_months})`,
          amount,
          type, payment_method, card_id || null, category_id || null,
          formatDate(recurringDate), installment_months, i + 1, groupId, notes || null,
        ],
      });
    }

    await executeTransaction(queries);
    return;
  }

  // Caso 4: Transação Simples (Única)
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
 * Remove uma transação.
 * @param {number} id - ID da transação
 * @param {'single' | 'all' | 'future'} deleteMode - Modo de exclusão
 */
export const deleteTransaction = async (id, deleteMode = 'single') => {
  if (deleteMode === 'all' || deleteMode === 'future') {
    const t = await executeSql('SELECT installment_group_id, date FROM transactions WHERE id=?', [id]);
    const row = t.rows.item(0);
    if (row && row.installment_group_id) {
      if (deleteMode === 'all') {
        await executeSql('DELETE FROM transactions WHERE installment_group_id=?', [row.installment_group_id]);
        return;
      } else if (deleteMode === 'future') {
        await executeSql('DELETE FROM transactions WHERE installment_group_id=? AND date >= ?', [row.installment_group_id, row.date]);
        return;
      }
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

/**
 * OrganizaGrana — Serviço de Banco de Dados SQLite
 * Inicializa e gerencia a conexão com o SQLite local via Cordova.
 * Singleton pattern: uma única instância de DB durante toda a execução.
 */

// ---- Instância do banco ----
let db = null;

/**
 * Verifica se está rodando dentro do Cordova (dispositivo/emulador)
 * ou no navegador (desenvolvimento via Vite dev server).
 */
const isCordovaAvailable = () =>
  typeof window !== 'undefined' && window.sqlitePlugin !== undefined;

/**
 * Abre (ou cria) o banco de dados SQLite.
 * Em ambiente Cordova: usa o plugin cordova-sqlite-storage.
 * Em ambiente browser: usa WebSQL como fallback (apenas para desenvolvimento).
 * @returns {Promise<Database>}
 */
export const openDatabase = () =>
  new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const config = {
      name: 'organizagrana.db',
      location: 'default',
    };

    if (isCordovaAvailable()) {
      // Ambiente Cordova (Android)
      db = window.sqlitePlugin.openDatabase(config, () => {
        console.log('[DB] SQLite aberto com sucesso (Cordova)');
        resolve(db);
      }, (err) => {
        console.error('[DB] Erro ao abrir SQLite:', err);
        reject(err);
      });
    } else {
      // Ambiente browser — WebSQL fallback para desenvolvimento
      if (window.openDatabase) {
        db = window.openDatabase('organizagrana.db', '1.0', 'OrganizaGrana DB', 5 * 1024 * 1024);
        console.log('[DB] WebSQL aberto (modo desenvolvimento)');
        resolve(db);
      } else {
        reject(new Error('[DB] Nenhum banco de dados disponível neste ambiente.'));
      }
    }
  });

/**
 * Executa uma query SQL com parâmetros.
 * @param {string} sql - Query SQL
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<SQLResultSet>}
 */
export const executeSql = (sql, params = []) =>
  new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('[DB] Banco não inicializado. Chame openDatabase() primeiro.'));
      return;
    }
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (tx, result) => resolve(result),
        (tx, err) => {
          console.error('[DB] Erro SQL:', sql, err);
          reject(err);
          return false;
        }
      );
    });
  });

/**
 * Executa múltiplas queries em uma única transação (mais performático).
 * @param {Array<{sql: string, params: Array}>} queries
 * @returns {Promise<void>}
 */
export const executeTransaction = (queries) =>
  new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('[DB] Banco não inicializado.'));
      return;
    }
    db.transaction(
      (tx) => {
        queries.forEach(({ sql, params = [] }) => {
          tx.executeSql(sql, params, null, (tx, err) => {
            console.error('[DB] Erro na transação:', err);
            return false;
          });
        });
      },
      (err) => reject(err),
      () => resolve()
    );
  });

/**
 * Inicializa o banco de dados:
 * 1. Abre a conexão
 * 2. Cria todas as tabelas (se não existirem)
 * 3. Popula categorias padrão (se o banco for novo)
 * @returns {Promise<void>}
 */
export const initDatabase = async () => {
  await openDatabase();

  // --- Criação das tabelas ---
  await executeTransaction([
    // Configuração do usuário (onboarding)
    {
      sql: `CREATE TABLE IF NOT EXISTS user_config (
        id          INTEGER PRIMARY KEY,
        name        TEXT,
        email       TEXT,
        gpt_enabled INTEGER DEFAULT 0,
        gpt_api_key TEXT,
        created_at  TEXT DEFAULT (datetime('now', 'localtime'))
      )`
    },
    // Categorias com ícone e cor
    {
      sql: `CREATE TABLE IF NOT EXISTS categories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        icon        TEXT NOT NULL,
        color       TEXT NOT NULL,
        type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        is_default  INTEGER DEFAULT 0
      )`
    },
    // Cartões de crédito
    {
      sql: `CREATE TABLE IF NOT EXISTS cards (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        last_digits   TEXT NOT NULL,
        closing_day   INTEGER NOT NULL,
        due_day       INTEGER NOT NULL,
        credit_limit  REAL DEFAULT 0,
        color         TEXT DEFAULT '#6C5CE7',
        created_at    TEXT DEFAULT (datetime('now', 'localtime'))
      )`
    },
    // Transações (receitas e despesas)
    {
      sql: `CREATE TABLE IF NOT EXISTS transactions (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        description           TEXT NOT NULL,
        amount                REAL NOT NULL,
        type                  TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        payment_method        TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit_card')),
        card_id               INTEGER REFERENCES cards(id) ON DELETE SET NULL,
        category_id           INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        date                  TEXT NOT NULL,
        is_recurring          INTEGER DEFAULT 0,
        recurrence_type       TEXT,
        installment_total     INTEGER,
        installment_current   INTEGER,
        installment_group_id  TEXT,
        notes                 TEXT,
        created_at            TEXT DEFAULT (datetime('now', 'localtime'))
      )`
    },
    // Configurações de notificações
    {
      sql: `CREATE TABLE IF NOT EXISTS notification_config (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL,
        enabled     INTEGER DEFAULT 1,
        days_before INTEGER DEFAULT 3,
        time        TEXT DEFAULT '09:00'
      )`
    },
  ]);

  // --- Migration: adiciona coluna 'name' se não existir ---
  try {
    await executeSql('ALTER TABLE user_config ADD COLUMN name TEXT', []);
    console.log('[DB] Migration: coluna name adicionada.');
  } catch (_) {
    // Coluna já existe — ignorar erro
  }

  // --- Migration: adiciona colunas GPT se não existirem ---
  try {
    await executeSql('ALTER TABLE user_config ADD COLUMN gpt_enabled INTEGER DEFAULT 0', []);
  } catch (_) {}
  try {
    await executeSql('ALTER TABLE user_config ADD COLUMN gpt_api_key TEXT', []);
  } catch (_) {}

  // --- Popula categorias padrão (apenas se ainda não existirem) ---
  const existing = await executeSql('SELECT COUNT(*) as count FROM categories', []);
  const count = existing.rows.item(0).count;

  if (count === 0) {
    console.log('[DB] Inserindo categorias padrão...');
    await seedDefaultCategories();
    await seedDefaultNotificationConfig();
  }

  console.log('[DB] Banco inicializado com sucesso.');
};

/**
 * Insere as categorias padrão no banco.
 */
const seedDefaultCategories = async () => {
  const defaultCategories = [
    // Receitas
    { name: 'Salário',       icon: '💼', color: '#00B894', type: 'income',  is_default: 1 },
    { name: 'Freelance',     icon: '💻', color: '#00CEC9', type: 'income',  is_default: 1 },
    { name: 'Investimentos', icon: '📈', color: '#6C5CE7', type: 'income',  is_default: 1 },
    { name: 'Presente',      icon: '🎁', color: '#A29BFE', type: 'income',  is_default: 1 },
    { name: 'Outros (R)',    icon: '✨', color: '#55EFC4', type: 'income',  is_default: 1 },
    // Despesas
    { name: 'Alimentação',   icon: '🍔', color: '#E17055', type: 'expense', is_default: 1 },
    { name: 'Transporte',    icon: '🚗', color: '#FDCB6E', type: 'expense', is_default: 1 },
    { name: 'Moradia',       icon: '🏠', color: '#74B9FF', type: 'expense', is_default: 1 },
    { name: 'Saúde',         icon: '💊', color: '#FF7675', type: 'expense', is_default: 1 },
    { name: 'Educação',      icon: '📚', color: '#A29BFE', type: 'expense', is_default: 1 },
    { name: 'Lazer',         icon: '🎬', color: '#FD79A8', type: 'expense', is_default: 1 },
    { name: 'Vestuário',     icon: '👕', color: '#81ECEC', type: 'expense', is_default: 1 },
    { name: 'Mercado',       icon: '🛒', color: '#55EFC4', type: 'expense', is_default: 1 },
    { name: 'Assinaturas',   icon: '📱', color: '#6C5CE7', type: 'expense', is_default: 1 },
    { name: 'Outros (D)',    icon: '📌', color: '#B2BEC3', type: 'expense', is_default: 1 },
  ];

  const queries = defaultCategories.map((cat) => ({
    sql: 'INSERT INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?)',
    params: [cat.name, cat.icon, cat.color, cat.type, cat.is_default],
  }));

  await executeTransaction(queries);
};

/**
 * Insere configuração padrão de notificações.
 */
const seedDefaultNotificationConfig = async () => {
  await executeTransaction([
    {
      sql: `INSERT INTO notification_config (type, enabled, days_before, time)
            VALUES ('card_due', 1, 3, '09:00')`,
    },
  ]);
};

export default { openDatabase, executeSql, executeTransaction, initDatabase };

/**
 * OrganizaGrana — Serviço de Usuário
 * Gerencia onboarding e dados do usuário no SQLite.
 */
import { executeSql } from './db.js';

/** Verifica se o onboarding já foi concluído */
export const isOnboardingDone = async () => {
  const result = await executeSql('SELECT COUNT(*) as count FROM user_config', []);
  return result.rows.item(0).count > 0;
};

/** Salva o e-mail do usuário (onboarding) */
export const saveUserEmail = async (email) => {
  await executeSql(
    'INSERT OR REPLACE INTO user_config (id, email) VALUES (1, ?)',
    [email]
  );
};

/** Retorna os dados do usuário */
export const getUserConfig = async () => {
  const result = await executeSql('SELECT * FROM user_config WHERE id=1', []);
  return result.rows.length > 0 ? result.rows.item(0) : null;
};

/** Atualiza o e-mail do usuário */
export const updateUserEmail = async (email) => {
  await executeSql(
    'UPDATE user_config SET email=? WHERE id=1',
    [email]
  );
};

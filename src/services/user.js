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

/** Salva o nome e e-mail do usuário (onboarding) */
export const saveUserProfile = async (name, email) => {
  await executeSql(
    'INSERT OR REPLACE INTO user_config (id, name, email) VALUES (1, ?, ?)',
    [name, email || null]
  );
};

/** Compatibilidade retroativa — salva apenas o e-mail */
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

/** Atualiza o nome do usuário */
export const updateUserName = async (name) => {
  await executeSql(
    'UPDATE user_config SET name=? WHERE id=1',
    [name]
  );
};

/** Atualiza o e-mail do usuário */
export const updateUserEmail = async (email) => {
  await executeSql(
    'UPDATE user_config SET email=? WHERE id=1',
    [email]
  );
};

/** Atualiza as configurações de integração do GPT */
export const updateGptConfig = async (enabled, apiKey) => {
  await executeSql(
    'UPDATE user_config SET gpt_enabled=?, gpt_api_key=? WHERE id=1',
    [enabled ? 1 : 0, apiKey || '']
  );
};


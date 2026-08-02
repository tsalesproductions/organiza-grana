/**
 * OrganizaGrana — Utilitários de Formatação de Moeda e Números
 */

/**
 * Formata um número como moeda BRL (R$).
 * @param {number} value
 * @param {boolean} showSign - se true, adiciona + para positivos
 * @returns {string}
 */
export const formatCurrency = (value, showSign = false) => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));

  if (showSign && value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

/**
 * Converte string digitada (ex: "1500") em número (1500.00).
 * Aceita vírgula como separador decimal.
 */
export const parseCurrencyInput = (str) => {
  const cleaned = String(str).replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

/**
 * Formata número de centavos para exibição (ex: 150000 → "1.500,00")
 */
export const centsToDisplay = (cents) => {
  return (cents / 100).toFixed(2).replace('.', ',');
};

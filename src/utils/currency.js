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
 * Converte string digitada ou formato BR (ex: "45,74" ou "4.574,74" ou "45.74") em número float (45.74).
 * @param {string|number} val
 * @returns {number}
 */
export const parseCurrencyInput = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  const str = String(val).trim();
  if (!str) return 0;

  // Se contém vírgula (formato BR padrão ex: "45,74" ou "4.574,74")
  if (str.includes(',')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // Se contém ponto mas não vírgula (ex: "45.74" do banco em edição)
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(str) || 0;
    }
    return parseFloat(str.replace(/\./g, '')) || 0;
  }

  return parseFloat(str) || 0;
};

/**
 * Máscara de moeda BRL em tempo real para inputs (ex: digita 4574 -> "45,74").
 * @param {string|number} val
 * @returns {string}
 */
export const formatCurrencyInput = (val) => {
  if (val === null || val === undefined || val === '') return '';

  let cents;
  if (typeof val === 'number') {
    cents = Math.round(val * 100);
  } else {
    const digitsOnly = String(val).replace(/\D/g, '');
    if (!digitsOnly) return '';
    cents = parseInt(digitsOnly, 10);
  }

  if (isNaN(cents) || cents === 0) return '0,00';

  const realValue = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(realValue);
};

/**
 * Formata número de centavos para exibição (ex: 150000 → "1.500,00")
 */
export const centsToDisplay = (cents) => {
  return (cents / 100).toFixed(2).replace('.', ',');
};

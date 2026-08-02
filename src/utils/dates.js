/**
 * OrganizaGrana — Utilitários de Data
 */

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
export const todayISO = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Formata uma data ISO (YYYY-MM-DD) para exibição (ex: "02 ago")
 */
export const formatDateShort = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

/**
 * Formata uma data ISO para exibição completa (ex: "2 de agosto de 2026")
 */
export const formatDateFull = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Retorna o nome do mês + ano (ex: "Agosto 2026")
 */
export const formatMonthYear = (month, year) => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

/**
 * Retorna { month, year } do mês atual
 */
export const getCurrentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

/**
 * Navega para o mês anterior ou próximo
 */
export const navigateMonth = (month, year, direction) => {
  const date = new Date(year, month - 1 + direction, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
};

/**
 * Agrupa transações por data (chave: data ISO)
 */
export const groupByDate = (transactions) => {
  const groups = {};
  transactions.forEach((t) => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  return groups;
};

/**
 * Retorna rótulo amigável para a data (ex: "Hoje", "Ontem", ou "02 ago")
 */
export const getDateLabel = (isoDate) => {
  const today = new Date();
  const date = new Date(isoDate + 'T12:00:00');
  const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
};

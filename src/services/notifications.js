/**
 * OrganizaGrana — Serviço de Notificações Locais
 * Utiliza cordova-plugin-local-notification para agendar lembretes.
 */
import { executeSql } from './db.js';
import { getAllCards } from './cards.js';

const rowsToArray = (rows) => {
  const arr = [];
  for (let i = 0; i < rows.length; i++) arr.push(rows.item(i));
  return arr;
};

/** Verifica se o plugin está disponível */
const isAvailable = () =>
  typeof window !== 'undefined' && window.cordova && window.cordova.plugins?.notification?.local;

/** Busca configurações de notificações do banco */
export const getNotificationConfig = async () => {
  const result = await executeSql('SELECT * FROM notification_config', []);
  return rowsToArray(result.rows);
};

/** Atualiza configuração de notificação */
export const updateNotificationConfig = async (id, { enabled, days_before, time }) => {
  await executeSql(
    'UPDATE notification_config SET enabled=?, days_before=?, time=? WHERE id=?',
    [enabled ? 1 : 0, days_before, time, id]
  );
  // Re-agenda todas as notificações após alterar config
  await scheduleAllNotifications();
};

/**
 * Agenda notificações para cartões de crédito e despesas recorrentes.
 */
export const scheduleAllNotifications = async () => {
  if (!isAvailable()) {
    console.log('[Notifications] Plugin não disponível neste ambiente.');
    return;
  }

  // Cancela todas as notificações agendadas anteriormente
  window.cordova.plugins.notification.local.cancelAll();

  // Busca configs de notificação
  const configs = await getNotificationConfig();
  const cardDueConfig = configs.find((c) => c.type === 'card_due') || { enabled: 1, days_before: 3, time: '09:00' };

  if (cardDueConfig.enabled === 0) return;

  const [hour, minute] = (cardDueConfig.time || '09:00').split(':').map(Number);
  const daysBefore = cardDueConfig.days_before || 3;

  const notifications = [];
  const today = new Date();

  // 1. Notificações para Faturas de Cartão de Crédito
  const cards = await getAllCards();
  cards.forEach((card, index) => {
    let dueDate = new Date(today.getFullYear(), today.getMonth(), card.due_day, hour, minute);
    if (dueDate <= today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const notifDate = new Date(dueDate);
    notifDate.setDate(notifDate.getDate() - daysBefore);

    if (notifDate > today) {
      notifications.push({
        id: card.id * 100 + index + 1,
        title: `💳 Fatura do ${card.name}`,
        text: `Sua fatura vence em ${daysBefore} ${daysBefore === 1 ? 'dia' : 'dias'} (dia ${card.due_day}).`,
        trigger: { at: notifDate },
        vibrate: true,
      });
    }
  });

  // 2. Notificações para Despesas Recorrentes
  const recurringResult = await executeSql(
    `SELECT description, MAX(amount) as amount, MIN(date) as date 
     FROM transactions 
     WHERE is_recurring = 1 AND type = 'expense' 
     GROUP BY installment_group_id`,
    []
  );
  const recurringList = rowsToArray(recurringResult.rows);

  recurringList.forEach((item, index) => {
    // Evita bug de timezone ao fazer new Date(item.date) (que pode cair no dia anterior)
    const dateStr = item.date || '';
    const dateParts = dateStr.split('-');
    const itemDay = dateParts.length === 3 ? parseInt(dateParts[2], 10) : 10;
    
    let dueDate = new Date(today.getFullYear(), today.getMonth(), itemDay, hour, minute);
    if (dueDate <= today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const notifDate = new Date(dueDate);
    notifDate.setDate(notifDate.getDate() - 1); // 1 dia antes da conta

    if (notifDate > today) {
      notifications.push({
        id: 5000 + index,
        title: `🔔 Lembrete de Conta`,
        text: `A conta "${item.description}" de R$ ${item.amount.toFixed(2).replace('.', ',')} vence amanhã.`,
        trigger: { at: notifDate },
        vibrate: true,
      });
    }
  });

  if (notifications.length > 0) {
    window.cordova.plugins.notification.local.schedule(notifications);
    console.log(`[Notifications] ${notifications.length} notificações agendadas com sucesso.`);
  }
};

/** Solicita permissão para notificações (necessário no Android 13+) */
export const requestNotificationPermission = () => {
  if (!isAvailable()) return Promise.resolve(true);

  return new Promise((resolve) => {
    window.cordova.plugins.notification.local.requestPermission((granted) => {
      console.log('[Notifications] Permissão:', granted ? 'concedida' : 'negada');
      resolve(granted);
    });
  });
};

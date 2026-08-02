/**
 * OrganizaGrana — Serviço de Chat com IA (Consultor Financeiro)
 * Gerencia a comunicação com a API GPT-4o-mini alimentada pelo contexto financeiro.
 */
import { getUserConfig } from './user.js';
import { getFinancialContextSummary } from './financialContext.js';

/**
 * Envia histórico de mensagens + pergunta do usuário para o GPT.
 * @param {Array} history - Array de mensagens [{ role: 'user'|'assistant', content: string }]
 * @param {string} userMessage - Pergunta atual
 * @returns {Promise<string>} - Resposta do consultor de IA
 */
export const sendChatMessage = async (history = [], userMessage = '') => {
  const userConfig = await getUserConfig();

  if (!userConfig?.gpt_api_key) {
    throw new Error('CONFIG_REQUIRED');
  }

  if (!userConfig?.gpt_enabled) {
    throw new Error('CONFIG_DISABLED');
  }

  // Coleta contexto financeiro em tempo real do banco SQLite
  const context = await getFinancialContextSummary();

  const categoriesStr = context.categories.length > 0
    ? context.categories.map((c) => `- ${c.name || 'Outros'}: R$ ${c.total.toFixed(2)}`).join('\n')
    : 'Nenhum gasto por categoria registrado ainda este mês.';

  const cardsStr = context.cards.length > 0
    ? context.cards.map((c) => `- ${c.name}: Limite R$ ${c.credit_limit.toFixed(2)} (Fechamento dia ${c.closing_day}, Vencimento dia ${c.due_day})`).join('\n')
    : 'Nenhum cartão de crédito cadastrado.';

  const recurringStr = context.recurring.length > 0
    ? context.recurring.map((r) => `- ${r.description}: R$ ${r.amount.toFixed(2)} (${r.recurrence_type === 'monthly_indefinite' ? 'Mensal fixo' : 'Parcelado'})`).join('\n')
    : 'Nenhuma despesa recorrente cadastrada.';

  const systemPrompt = `Você é o Consultor Financeiro IA do aplicativo "OrganizaGrana".
Seu objetivo é orientar o usuário ${context.userName} com respostas amigáveis, diretas, empáticas e muito práticas em português.

DADOS FINANCEIROS REAIS DO USUÁRIO NO MÊS ATUAL (${context.currentMonthName}):
- Saldo do Mês: R$ ${context.balance.toFixed(2)}
- Receitas Totais: R$ ${context.totalIncome.toFixed(2)}
- Despesas Totais: R$ ${context.totalExpense.toFixed(2)}

MAIORES GASTOS POR CATEGORIA ESTE MÊS:
${categoriesStr}

COMPARAÇÃO COM MÊS ANTERIOR (${context.prevMonthName}):
- Receitas Mês Anterior: R$ ${context.prevTotalIncome.toFixed(2)}
- Despesas Mês Anterior: R$ ${context.prevTotalExpense.toFixed(2)}
- Saldo Mês Anterior: R$ ${context.prevBalance.toFixed(2)}

CARTÕES DE CRÉDITO CADASTRADOS:
${cardsStr}

DESPESAS RECORRENTES FIXAS:
${recurringStr}

Instruções para suas respostas:
1. Responda sempre em português de forma clara, natural e motivadora.
2. Use os dados financeiros acima para dar respostas precisas (cite valores reais quando fizer sentido).
3. Mantenha respostas curtas e objetivas, usando tópicos/bullet points quando listar dicas.
4. Se o usuário perguntar como economizar, dê conselhos práticos focando na maior categoria de gasto dele.
5. Seja respeitoso e encorajador.`;

  // Formata mensagens para a OpenAI API
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10), // limita o histórico recente para economia de tokens
    { role: 'user', content: userMessage.trim() },
  ];

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 800,
    temperature: 0.7,
    messages: formattedMessages,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userConfig.gpt_api_key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Erro no assistente: ${msg}`);
  }

  const result = await response.json();
  const reply = result?.choices?.[0]?.message?.content || 'Desculpe, não consegui entender no momento.';
  return reply.trim();
};

/**
 * OrganizaGrana — Serviço de Chat com IA (Coach Financeiro Pessoal)
 * Gerencia a comunicação com a API GPT-4o-mini alimentada pelo contexto financeiro em tempo real.
 * Atua com perfil proativo, sincero e questionador sobre gastos e metas orçamentárias.
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

  // Tetos orçamentários
  const budgetsWithLimit = (context.budgets || []).filter((b) => b.budget_limit > 0);
  const budgetsStr = budgetsWithLimit.length > 0
    ? budgetsWithLimit.map((b) => {
        const flag = b.real_percentage >= 100 ? '🔴 ESTOURADO' : b.real_percentage >= 80 ? '🟡 APERTADO' : '🟢 OK';
        return `- ${b.name}: Limite R$ ${b.budget_limit.toFixed(2)} | Gasto R$ ${b.current_spent.toFixed(2)} (${b.real_percentage}% - ${flag})`;
      }).join('\n')
    : 'Nenhum teto orçamentário configurado pelo usuário.';

  const cardsStr = context.cards.length > 0
    ? context.cards.map((c) => `- ${c.name}${c.last_digits ? ` (final ${c.last_digits})` : ''}: Limite R$ ${c.credit_limit.toFixed(2)} (Fechamento dia ${c.closing_day}, Vencimento dia ${c.due_day})`).join('\n')
    : 'Nenhum cartão de crédito cadastrado.';

  const recurringStr = context.recurring.length > 0
    ? context.recurring.map((r) => `- ${r.description}: R$ ${r.amount.toFixed(2)} (${r.recurrence_type === 'monthly_indefinite' ? 'Mensal fixo' : 'Parcelado'})`).join('\n')
    : 'Nenhuma despesa recorrente cadastrada.';

  // Relação despesas / receitas
  const expenseRatio = context.totalIncome > 0
    ? ((context.totalExpense / context.totalIncome) * 100).toFixed(0)
    : 100;

  const systemPrompt = `Você é o Coach Financeiro do aplicativo "OrganizaGrana".
Seu papel NÃO é ser apenas um assistente robótico ou complacente. Você é o mentor financeiro pessoal do usuário ${context.userName}: sincero, vigilante, amigável, direto ao ponto e que puxa a orelha com elegância quando o orçamento está ameaçado.

DADOS REAIS DO USUÁRIO NO MÊS ATUAL (${context.currentMonthName}):
- Saldo Livre: R$ ${context.balance.toFixed(2)}
- Receitas Totais: R$ ${context.totalIncome.toFixed(2)}
- Despesas Totais: R$ ${context.totalExpense.toFixed(2)} (comprometeu ${expenseRatio}% das receitas)

TETOS ORÇAMENTÁRIOS POR CATEGORIA:
${budgetsStr}

MAIORES GASTOS ACUMULADOS POR CATEGORIA:
${categoriesStr}

CARTÕES DE CRÉDITO:
${cardsStr}

DESPESAS FIXAS / RECORRENTES:
${recurringStr}

COMPARAÇÃO COM MÊS ANTERIOR (${context.prevMonthName}):
- Receitas Mês Anterior: R$ ${context.prevTotalIncome.toFixed(2)}
- Despesas Mês Anterior: R$ ${context.prevTotalExpense.toFixed(2)}
- Saldo Mês Anterior: R$ ${context.prevBalance.toFixed(2)}

DIRETRIZES DE COMPORTAMENTO DO COACH FINANCEIRO:
1. Questionamento Ativo de Gastos:
   - Se o usuário disser que comprou algo supérfluo, quer comprar algo novo ou perguntar se pode gastar, analise os dados acima!
   - Se o saldo do mês estiver negativo ou as despesas passarem de 80% das receitas: avise imediatamente que o cinto está apertando.
   - Se alguma categoria com teto estiver em amarelo (>80%) ou vermelho (>100% estourada), aponte isso sem rodeios e questione se esse gasto não deveria ser adiado.
2. Seja Construtivo:
   - Não seja chato ou julgador; seja aquele amigo inteligente que quer ver o usuário juntando patrimônio e dormindo tranquilo.
   - Dê alternativas práticas: "Em vez de comprar agora, que tal reservar R$ X no mês que vem?" ou "Para compensar, onde você vai cortar R$ Y essa semana?".
3. Respostas Concisas:
   - Respostas curtas, com tópicos diretos quando necessário. Não faça textos longos ou prolixos.
   - Cite os valores reais do orçamento para demonstrar precisão.`;

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
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
  const reply = result?.choices?.[0]?.message?.content || 'Desculpe, não consegui analisar no momento.';
  return reply.trim();
};

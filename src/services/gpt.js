/**
 * OrganizaGrana — Serviço de Integração GPT Vision
 * Analisa imagens de comprovantes, tickets, boletos e extratos para extrair transações,
 * identificando datas de vencimento, cartões de crédito, códigos de pagamento
 * e fornecendo diagnóstico crítico do orçamento financeiro (Coach IA).
 */
import { getUserConfig } from './user.js';

/** Converte File/Blob em base64 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove o prefixo "data:image/...;base64,"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Analisa imagens usando GPT-4o-mini Vision.
 * Retorna uma lista de transações identificadas com metadados avançados.
 *
 * @param {File[]} imageFiles - Array de arquivos de imagem
 * @param {string} transactionType - 'expense' | 'income' | 'auto'
 * @param {string} observations - Instruções extras do usuário
 * @param {Array} availableCategories - Categorias cadastradas [{ id, name, type }]
 * @param {Array} availableCards - Cartões cadastrados [{ id, name, last_digits }]
 * @param {Object} financialContext - Resumo do orçamento do mês e limites
 * @returns {Promise<Array>} - Lista de transações no formato enriquecido
 */
export const analyzeImagesWithGPT = async (
  imageFiles,
  transactionType = 'auto',
  observations = '',
  availableCategories = [],
  availableCards = [],
  financialContext = null
) => {
  const userConfig = await getUserConfig();

  if (!userConfig?.gpt_api_key) {
    throw new Error('API Key do GPT não configurada. Acesse Configurações → Integração com IA.');
  }

  if (!userConfig?.gpt_enabled) {
    throw new Error('Integração com GPT está desativada. Ative em Configurações → Integração com IA.');
  }

  // Converte todas as imagens para base64
  const imageContents = await Promise.all(
    imageFiles.map(async (file) => {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
          detail: 'high',
        },
      };
    })
  );

  // Instruções de tipo
  const typeInstruction =
    transactionType === 'income'
      ? 'Trate todos os valores como RECEITAS (entradas de dinheiro).'
      : transactionType === 'expense'
        ? 'Trate todos os valores como DESPESAS (saídas de dinheiro).'
        : 'Identifique automaticamente se cada item é receita (income) ou despesa (expense).';

  // Instruções de categorias
  const categoryInstruction = availableCategories.length > 0
    ? `\nCATEGORIAS CADASTRADAS NO APP:\n${availableCategories.map((c) => `- ID ${c.id}: "${c.name}" (${c.type})`).join('\n')}\nSe o gasto corresponder a uma categoria existente, retorne o "category_id" numérico correspondente e o nome em "category_hint".`
    : '';

  // Instruções de cartões cadastrados
  const cardsInstruction = availableCards.length > 0
    ? `\nCARTÕES DE CRÉDITO CADASTRADOS DO USUÁRIO:\n${availableCards.map((c) => `- ID ${c.id}: "${c.name}" (finais: ${c.last_digits || 'N/A'})`).join('\n')}\nSe a imagem indicar pagamento em cartão de crédito (ex: menção a Visa, Mastercard, Elo, Crédito ou aos dígitos finais de algum cartão), defina "payment_method": "credit_card" e "card_id" com o ID correspondente. Se não houver correspondência ou for débito/dinheiro/pix, use "payment_method": "cash".`
    : '\nNão há cartões de crédito cadastrados. Use "payment_method": "cash".';

  // Contexto orçamentário para atuação como Coach
  let contextInstruction = '';
  if (financialContext) {
    contextInstruction = `\nSITUAÇÃO FINANCEIRA DO USUÁRIO NO MÊS:
- Saldo atual disponível: R$ ${(financialContext.balance || 0).toFixed(2)}
- Despesas acumuladas: R$ ${(financialContext.totalExpense || 0).toFixed(2)}
- Receitas acumuladas: R$ ${(financialContext.totalIncome || 0).toFixed(2)}`;
    if (financialContext.budgetsSummary) {
      contextInstruction += `\n- Tetos Orçamentários por categoria: ${financialContext.budgetsSummary}`;
    }
    contextInstruction += `\nATUAÇÃO COMO COACH FINANCEIRO ("financial_insight"):
Analise criticamente esse lançamento. Se o gasto for de alto valor, supérfluo, se a categoria já estiver com o orçamento apertado (>75%) ou estourado, ou se o saldo do mês estiver negativo, escreva uma reflexão/provocação construtiva de 1 frase (ex: "⚠️ Esse gasto de R$ 180 em Restaurante atinge 90% do seu limite mensal. Faz sentido manter?"). Se for conta rotineira necessária e dentro da normalidade, pode deixar null ou dar uma dica rápida.`;
  }

  const systemPrompt = `Você é o Consultor e Assistente Financeiro IA do "OrganizaGrana".
Analise a imagem fornecida (ticket fiscal, cupom de compras, boleto bancário, conta de água/luz/energia/telefone, fatura de cartão, recibo ou extrato) e extraia com precisão cirúrgica os dados financeiros.

${typeInstruction}
${categoryInstruction}
${cardsInstruction}
${contextInstruction}

REGRAS DE VENCIMENTO E STATUS:
1. Se for uma CONTA A PAGAR / BOLETO BANCÁRIO / FATURA COM VENCIMENTO FUTURO:
   - "status": "pending"
   - "due_date": "YYYY-MM-DD" (a data limite de vencimento expressa no documento)
   - "date": a data de vencimento (YYYY-MM-DD)
   - "payment_code": extraia a linha digitável ou código de barras de 47/48 dígitos ou código Pix Copia e Cola completo se visível.
2. Se for um COMPROVANTE DE PAGAMENTO JÁ EFETUADO / CUPOM FISCAL / RECIBO:
   - "status": "paid"
   - "date": "YYYY-MM-DD" (data em que a compra/pagamento ocorreu)
   - "due_date": null

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações adicionais):
[
  {
    "description": "Nome do estabelecimento ou serviço claro e conciso",
    "amount": 0.00,
    "type": "expense",
    "category_id": null,
    "category_hint": "Nome sugerido da categoria",
    "date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD ou null",
    "status": "paid ou pending",
    "payment_method": "cash ou credit_card",
    "card_id": null,
    "payment_code": "linha digitável / pix ou null",
    "financial_insight": "Reflexão crítica sobre o gasto ou null"
  }
]

Regras importantes:
- Use valores em Reais (BRL) com 2 casas decimais.
- Se a imagem estiver ilegível, retorne: {"error": "ilegivel", "message": "Descreva o problema brevemente"}
- Se não houver dados financeiros na imagem, retorne: {"error": "sem_dados", "message": "Não foram encontrados valores financeiros"}
- O campo "type" deve ser sempre "income" ou "expense".`;

  const userMessage = observations
    ? `Instruções adicionais: ${observations}`
    : 'Analise a imagem, extraia os lançamentos com data de vencimento, método de pagamento, código de barras/pix e análise de orçamento.';

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 1800,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          ...imageContents,
          { type: 'text', text: userMessage },
        ],
      },
    ],
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
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData?.error?.message || `Erro HTTP ${response.status}`;
    throw new Error(`Erro na API do GPT: ${msg}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content || '';

  // Parse do JSON retornado pela IA
  let parsed;
  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('[GPT Service] Falha ao parsear retorno:', content);
    throw new Error('A IA retornou um formato inesperado. Tente novamente.');
  }

  if (parsed?.error) {
    throw new Error(
      parsed.error === 'ilegivel'
        ? 'Não foi possível ler a imagem com nitidez. Tente uma foto com melhor foco e iluminação.'
        : 'Nenhum valor financeiro reconhecível na imagem.'
    );
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];

  return items
    .filter((item) => item.description && item.amount > 0)
    .map((item) => ({
      description: String(item.description).slice(0, 100),
      amount: Math.abs(parseFloat(item.amount) || 0),
      type: item.type === 'income' ? 'income' : 'expense',
      category_id: typeof item.category_id === 'number' ? item.category_id : null,
      category_hint: item.category_hint || '',
      date: item.date || item.due_date || null,
      due_date: item.due_date || null,
      status: item.status === 'pending' ? 'pending' : 'paid',
      payment_method: item.payment_method === 'credit_card' ? 'credit_card' : 'cash',
      card_id: typeof item.card_id === 'number' ? item.card_id : null,
      payment_code: item.payment_code || null,
      financial_insight: item.financial_insight || null,
    }));
};

/**
 * Extrai o preço numérico de uma foto de etiqueta de supermercado usando GPT Vision.
 * @param {string} base64Data - imagem em base64
 * @returns {Promise<number>} - valor do preço extraído
 */
export const extractPriceFromImage = async (base64Data) => {
  const userConfig = await getUserConfig();

  if (!userConfig?.gpt_api_key || !userConfig?.gpt_enabled) {
    throw new Error('CONFIG_REQUIRED');
  }

  const mimeType = 'image/jpeg';
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `Você é um assistente especialista em extrair preços de etiquetas de supermercado.
Analise a imagem e retorne APENAS um JSON no formato: {"price": 14.90} com o valor numérico em Reais (BRL).
Se houver múltiplos preços (ex: preço normal vs preço clube), prefira o preço menor/promocional se visível.
Se não houver preço visível na imagem, retorne: {"error": "nao_encontrado"}.
NÃO inclua formatação markdown nem explicações.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${cleanBase64}`,
              detail: 'high',
            },
          },
          { type: 'text', text: 'Extraia o preço desta etiqueta.' },
        ],
      },
    ],
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
    throw new Error('Erro na API de IA ao ler a foto.');
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content || '';
  const cleaned = content.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (parsed.error || typeof parsed.price !== 'number') {
    throw new Error('Preço não identificado na imagem.');
  }

  return Math.abs(parsed.price);
};

/**
 * Converte comando de voz transcrito em dados estruturados de transação financeira via GPT.
 * @param {string} speechText - Frase falada pelo usuário
 * @param {Array} availableCategories - Categorias do app
 * @param {Array} availableCards - Cartões do usuário
 * @returns {Promise<Object>}
 */
export const parseTransactionFromVoice = async (speechText, availableCategories = [], availableCards = []) => {
  const userConfig = await getUserConfig();

  if (!userConfig?.gpt_api_key || !userConfig?.gpt_enabled) {
    throw new Error('CONFIG_REQUIRED');
  }

  const categoriesPrompt = availableCategories.length > 0
    ? `\nCATEGORIAS CADASTRADAS: ${availableCategories.map((c) => `[ID ${c.id}: ${c.name} (${c.type})]`).join(', ')}`
    : '';

  const cardsPrompt = availableCards.length > 0
    ? `\nCARTÕES CADASTRADOS: ${availableCards.map((c) => `[ID ${c.id}: ${c.name} final ${c.last_digits || ''}]`).join(', ')}`
    : '';

  const systemPrompt = `Você é um extrator de transações financeiras a partir de áudios/comandos falados em português brasileiro.
Interprete a frase e extraia os dados.
${categoriesPrompt}
${cardsPrompt}

Retorne APENAS um JSON no formato:
{
  "description": "Descrição curta e clara (ex: Almoço, Gasolina, Salário)",
  "amount": 0.00,
  "type": "expense ou income",
  "category_id": null ou id_numérico_da_categoria,
  "payment_method": "cash ou credit_card",
  "card_id": null ou id_do_cartao
}
Se for gasto no cartão de crédito, defina "payment_method": "credit_card" e "card_id" correspondente se houver.
Não use markdown nem explicações.`;

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: speechText },
    ],
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
    throw new Error('Falha na interpretação por IA.');
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content || '';
  const cleaned = content.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    description: parsed.description || 'Lançamento por Voz',
    amount: Math.abs(parseFloat(parsed.amount) || 0),
    type: parsed.type === 'income' ? 'income' : 'expense',
    category_id: typeof parsed.category_id === 'number' ? parsed.category_id : null,
    payment_method: parsed.payment_method === 'credit_card' ? 'credit_card' : 'cash',
    card_id: typeof parsed.card_id === 'number' ? parsed.card_id : null,
  };
};

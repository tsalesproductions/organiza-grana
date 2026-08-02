/**
 * OrganizaGrana — Serviço de Integração GPT Vision
 * Analisa imagens de comprovantes, tickets e extratos para extrair transações.
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
 * Retorna uma lista de transações identificadas.
 *
 * @param {File[]} imageFiles - Array de arquivos de imagem
 * @param {string} transactionType - 'expense' | 'income' | 'auto'
 * @param {string} observations - Instruções extras do usuário
 * @returns {Promise<Array>} - Lista de transações no formato { description, amount, type, category_hint, date }
 */
export const analyzeImagesWithGPT = async (
  imageFiles,
  transactionType = 'auto',
  observations = '',
  availableCategories = []
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
          detail: 'auto',
        },
      };
    })
  );

  // Monta o prompt conforme o tipo de transação
  const typeInstruction =
    transactionType === 'income'
      ? 'Trate todos os valores como RECEITAS (entradas de dinheiro).'
      : transactionType === 'expense'
        ? 'Trate todos os valores como DESPESAS (saídas de dinheiro).'
        : 'Identifique automaticamente se cada item é receita (income) ou despesa (expense).';

  const categoryInstruction = availableCategories.length > 0
    ? `\nCategorias disponíveis no aplicativo: [${availableCategories.map((c) => c.name).join(', ')}]. Para "category_hint", TENTE ASSOCIAR EXATAMENTE ao nome de uma destas categorias se for pertinente.`
    : '';

  const systemPrompt = `Você é um assistente especialista em extração de dados financeiros de imagens.
Analise a imagem fornecida (ticket, comprovante, nota fiscal, extrato ou fatura) e extraia as transações financeiras.

${typeInstruction}${categoryInstruction}

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
[
  {
    "description": "Descrição curta e clara",
    "amount": 0.00,
    "type": "expense",
    "category_hint": "Sugestão de categoria",
    "date": "YYYY-MM-DD ou null se não identificado"
  }
]

Regras importantes:
- Use valores em Reais (BRL) com 2 casas decimais.
- Se a imagem estiver ilegível, retorne: {"error": "ilegivel", "message": "Descreva o problema brevemente"}
- Se não houver dados financeiros na imagem, retorne: {"error": "sem_dados", "message": "Não foram encontrados valores financeiros"}
- Para tickets com múltiplos itens: agrupe por categoria ou retorne o total, conforme solicitado nas instruções extras.
- O campo "type" deve ser "income" ou "expense".
- NÃO inclua valores de troco ou taxa de serviço automaticamente, a menos que explicitamente solicitado.`;

  const userMessage = observations
    ? `Instruções adicionais: ${observations}`
    : 'Analise a imagem e extraia os dados financeiros.';

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 1500,
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
    // Remove possíveis blocos markdown caso o modelo insista em adicioná-los
    const cleaned = content.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error('A IA retornou um formato inesperado. Tente novamente.');
  }

  // Verifica se é um erro retornado pela IA
  if (parsed?.error) {
    throw new Error(
      parsed.error === 'ilegivel'
        ? 'Não foi possível ler a imagem. Tente uma foto com melhor iluminação e foco.'
        : 'Nenhum dado financeiro encontrado na imagem.'
    );
  }

  // Garante que é um array
  const items = Array.isArray(parsed) ? parsed : [parsed];

  // Valida e sanitiza cada item
  return items
    .filter((item) => item.description && item.amount > 0)
    .map((item) => ({
      description: String(item.description).slice(0, 100),
      amount: Math.abs(parseFloat(item.amount) || 0),
      type: item.type === 'income' ? 'income' : 'expense',
      category_hint: item.category_hint || '',
      date: item.date || null,
    }));
};

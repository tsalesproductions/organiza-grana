/**
 * OrganizaGrana — AIChatSheet
 * Interface de Chatbot Consultor Financeiro com IA, renderizador de Markdown,
 * histórico persistente e opção de limpar conversa.
 */
import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../../services/gptChat.js';
import { getUserConfig } from '../../services/user.js';
import './AIChatSheet.css';

const QUICK_PROMPTS = [
  '📊 Como estão meus gastos este mês?',
  '💡 Onde posso economizar dinheiro?',
  '📈 Compare meus gastos com o mês passado',
  '💳 Qual a situação das minhas faturas?',
];

const CHAT_STORAGE_KEY = 'organizagrana_ai_chat_history';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Olá! Sou o seu Consultor Financeiro IA. Como posso te ajudar a analisar suas finanças ou economizar hoje?',
};

const loadSavedMessages = () => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [INITIAL_MESSAGE];
};

/** Formata texto Markdown inline (**bold**, *italic*, `code`) */
const parseInlineMarkdown = (str) => {
  const parts = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="ai-md-code">{token.slice(1, -1)}</code>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
};

/** Formata blocos de texto Markdown */
const renderMarkdown = (content) => {
  if (!content) return null;
  const lines = content.split('\n');

  return lines.map((line, lIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      return <h4 key={lIdx} className="ai-md-h3">{parseInlineMarkdown(trimmed.slice(4))}</h4>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={lIdx} className="ai-md-h2">{parseInlineMarkdown(trimmed.slice(3))}</h3>;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={lIdx} className="ai-md-list-item">
          <span className="ai-md-bullet">•</span>
          <span>{parseInlineMarkdown(trimmed.slice(2))}</span>
        </div>
      );
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={lIdx} className="ai-md-list-item">
          <span className="ai-md-num">{numMatch[1]}.</span>
          <span>{parseInlineMarkdown(numMatch[2])}</span>
        </div>
      );
    }

    if (!trimmed) {
      return <div key={lIdx} style={{ height: 4 }} />;
    }

    return <p key={lIdx} className="ai-md-p">{parseInlineMarkdown(line)}</p>;
  });
};

const AIChatSheet = ({ onClose, onOpenSettings }) => {
  const [messages, setMessages] = useState(loadSavedMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    getUserConfig().then((cfg) => {
      if (!cfg?.gpt_api_key || !cfg?.gpt_enabled) {
        setConfigured(false);
      }
    });
  }, []);

  // Salva no localStorage quando messages muda
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar todo o histórico da conversa com a IA?')) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages([INITIAL_MESSAGE]);
    }
  };

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', content: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const apiHistory = updatedMessages.filter((m) => m.role === 'user' || m.role === 'assistant');
      const reply = await sendChatMessage(apiHistory.slice(-6), query);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      let errText = 'Ocorreu um erro ao consultar a IA. Tente novamente.';
      if (err.message === 'CONFIG_REQUIRED' || err.message === 'CONFIG_DISABLED') {
        setConfigured(false);
        errText = 'Por favor, ative a Integração com IA em Configurações.';
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${errText}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="og-sheet-overlay" onClick={onClose} />
      <div className="ai-chat-sheet animate-slide-up">
        {/* Header */}
        <div className="ai-chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="og-back-btn" onClick={onClose} aria-label="Fechar">
              ←
            </button>
            <div className="ai-chat-header__info">
              <span className="ai-chat-header__avatar">🤖</span>
              <div>
                <h2 className="ai-chat-header__title">Consultor IA</h2>
                <p className="ai-chat-header__subtitle">Análise financeira inteligente</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="og-btn og-btn--ghost og-btn--sm"
            onClick={handleClearHistory}
            title="Limpar Histórico de Conversa"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            🧹 Limpar
          </button>
        </div>

        {!configured ? (
          <div className="ai-chat-unconfigured">
            <div className="ai-chat-unconfigured__icon">🔑</div>
            <h3 className="ai-chat-unconfigured__title">Ative a Integração com IA</h3>
            <p className="ai-chat-unconfigured__desc">
              Para conversar com o seu Consultor Financeiro com IA, você precisa informar sua API Key do GPT em Configurações.
            </p>
            {onOpenSettings && (
              <button className="og-btn og-btn--primary" onClick={onOpenSettings}>
                ⚙️ Ir para Configurações
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mensagens */}
            <div className="ai-chat-messages">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`ai-chat-bubble ai-chat-bubble--${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="ai-chat-bubble__avatar">🤖</span>
                  )}
                  <div className="ai-chat-bubble__content">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ai-chat-bubble ai-chat-bubble--assistant">
                  <span className="ai-chat-bubble__avatar">🤖</span>
                  <div className="ai-chat-bubble__content ai-chat-typing">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chips de Perguntas Rápidas */}
            <div className="ai-chat-chips">
              {QUICK_PROMPTS.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  className="ai-chat-chip"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input de Mensagem */}
            <form
              className="ai-chat-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                className="og-input ai-chat-input"
                placeholder="Pergunte sobre suas finanças..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className={`og-btn og-btn--primary ai-chat-send-btn ${!input.trim() || loading ? 'og-btn--disabled' : ''}`}
                disabled={!input.trim() || loading}
              >
                ➔
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
};

export default AIChatSheet;

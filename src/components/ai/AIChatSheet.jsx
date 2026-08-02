/**
 * OrganizaGrana — AIChatSheet
 * Interface de Chatbot Consultor Financeiro com IA.
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

const AIChatSheet = ({ onClose, onOpenSettings }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou o seu Consultor Financeiro IA. Como posso te ajudar a analisar suas finanças ou economizar hoje?',
    },
  ]);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', content: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Passa apenas as mensagens anteriores excluindo mensagens de boas vindas
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
                    {msg.content.split('\n').map((line, lIdx) => (
                      <p key={lIdx}>{line}</p>
                    ))}
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

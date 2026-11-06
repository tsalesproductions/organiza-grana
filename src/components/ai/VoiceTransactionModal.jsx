/**
 * OrganizaGrana — VoiceTransactionModal
 * Modal moderno de lançamento por comando de voz com IA.
 * Utiliza reconhecimento de voz nativo + IA para extrair transação e salvar em 1 toque.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, X, Loader2, ArrowUpRight, ArrowDownLeft, CreditCard } from 'lucide-react';
import { parseTransactionFromVoice } from '../../services/gpt.js';
import { getAllCategories } from '../../services/categories.js';
import { getAllCards } from '../../services/cards.js';
import { createTransaction } from '../../services/transactions.js';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../../utils/currency.js';
import { todayISO } from '../../utils/dates.js';
import './VoiceTransactionModal.css';

const VoiceTransactionModal = ({ open, onClose, onSave, showToast }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (open) {
      getAllCategories().then(setCategories);
      getAllCards().then(setCards);
      setTranscript('');
      setManualText('');
      setParsedData(null);
      setError('');
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [open]);

  const doCordovaListening = () => {
    const cordovaSpeech = window.plugins?.speechRecognition;
    if (!cordovaSpeech) return;

    setIsRecording(true);
    setError('');

    cordovaSpeech.startListening(
      (matches) => {
        setIsRecording(false);
        if (Array.isArray(matches) && matches.length > 0) {
          const text = matches[0];
          setTranscript(text);
          setManualText(text);
        }
      },
      (err) => {
        setIsRecording(false);
        console.warn('[Cordova Speech] Erro:', err);
        // Códigos normais de cancelamento ou timeout
        if (err !== 2 && err !== 'No match' && err !== 'User cancelled') {
          setError('Não conseguimos ouvir com clareza. Fale novamente ou digite abaixo.');
        }
      },
      {
        language: 'pt-BR',
        matches: 5,
        prompt: 'Diga o lançamento (ex: Almoço 35 reais)',
        showPartial: false,
        showPopup: true,
      }
    );
  };

  const startListening = () => {
    setError('');

    // 1. Cordova Speech Recognition Plugin (Dispositivo Android nativo com permissões)
    const cordovaSpeech = window.plugins?.speechRecognition;
    if (cordovaSpeech) {
      cordovaSpeech.hasPermission(
        (hasPerm) => {
          if (!hasPerm) {
            cordovaSpeech.requestPermission(
              () => doCordovaListening(),
              (err) => {
                console.warn('[Speech] Permissão negada:', err);
                setError('Permissão de microfone negada. Conceda acesso nas configurações ou digite abaixo.');
              }
            );
          } else {
            doCordovaListening();
          }
        },
        () => {
          // Se falhar ao verificar permissão, tenta pedir direto
          cordovaSpeech.requestPermission(
            () => doCordovaListening(),
            () => {
              setError('Permissão de microfone necessária para falar.');
            }
          );
        }
      );
      return;
    }

    // 2. Web Speech API (Fallback para Navegador Desktop)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Reconhecimento de voz não suportado neste navegador. Digite abaixo.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
        setManualText(current);
      };

      recognition.onerror = (e) => {
        console.warn('[Speech] Erro:', e);
        setIsRecording(false);
        if (e.error === 'not-allowed') {
          setError('Permissão de microfone negada. Ative nas permissões do app.');
        } else if (e.error !== 'no-speech') {
          setError('Não conseguimos ouvir. Fale novamente ou digite abaixo.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('[Speech] Falha ao iniciar:', err);
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    if (window.plugins?.speechRecognition) {
      try {
        window.plugins.speechRecognition.stopListening(
          () => setIsRecording(false),
          () => setIsRecording(false)
        );
      } catch (_) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleProcessVoice = async () => {
    const textToProcess = (transcript || manualText).trim();
    if (!textToProcess) {
      setError('Fale ou digite algo primeiro.');
      return;
    }

    stopListening();
    setLoading(true);
    setError('');

    try {
      const result = await parseTransactionFromVoice(textToProcess, categories, cards);
      setParsedData(result);
    } catch (err) {
      console.error('[Voice] Erro ao interpretar:', err);
      setError('Não foi possível interpretar o lançamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedData || parsedData.amount <= 0) return;

    try {
      setLoading(true);
      const isCard = parsedData.type === 'expense' && parsedData.payment_method === 'credit_card';

      await createTransaction({
        description: parsedData.description,
        amount: parsedData.amount,
        type: parsedData.type,
        payment_method: isCard ? 'credit_card' : 'cash',
        card_id: isCard ? parsedData.card_id : null,
        category_id: parsedData.category_id || null,
        date: todayISO(),
        status: 'paid',
        notes: 'Adicionado por Comando de Voz',
      });

      showToast?.('Lançamento salvo com sucesso!', 'success');
      onSave?.();
      onClose();
    } catch (err) {
      setError('Erro ao salvar no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="og-voice-overlay" onClick={onClose} />
      <div className="og-voice-modal animate-slide-up" role="dialog" aria-modal="true">
        <div className="og-voice-modal__handle" onClick={onClose} />

        <div className="og-voice-modal__header">
          <div className="og-voice-modal__icon-badge">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="og-voice-modal__title">Lançamento por Voz</h3>
            <p className="og-voice-modal__sub">Fale normalmente: "Almoço de 35 reais no cartão"</p>
          </div>
          <button className="og-voice-modal__close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!parsedData ? (
          <div className="og-voice-modal__body">
            {/* Animação do Microfone */}
            <div className="og-voice-mic-container">
              <button
                type="button"
                className={`og-voice-mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopListening : startListening}
              >
                {isRecording ? <Mic size={36} color="#fff" /> : <MicOff size={36} color="#6C5CE7" />}
              </button>
              <div className="og-voice-waves">
                <span className={`wave ${isRecording ? 'active' : ''}`} />
                <span className={`wave ${isRecording ? 'active' : ''}`} />
              </div>
            </div>

            <p className="og-voice-status">
              {isRecording ? 'Ouvindo você... Fale seu gasto ou receita' : 'Toque no microfone para falar'}
            </p>

            {/* Transcrição ou Digitação de Fallback */}
            <div className="og-voice-transcript-box">
              <textarea
                className="og-voice-input"
                placeholder="Ou digite aqui (ex: Gastei 20 reais no café no pix)..."
                value={manualText}
                onChange={(e) => {
                  setManualText(e.target.value);
                  setTranscript(e.target.value);
                }}
                rows={2}
              />
            </div>

            {error && <p className="og-voice-error">{error}</p>}

            <button
              className="og-btn og-btn--primary og-btn--full"
              onClick={handleProcessVoice}
              disabled={loading || (!transcript.trim() && !manualText.trim())}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Interpretando com IA...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Processar Lançamento
                </>
              )}
            </button>
          </div>
        ) : (
          /* Confirmação do Lançamento Extraído */
          <div className="og-voice-modal__body animate-scale-in">
            <div className="og-voice-summary-card">
              <div className="og-voice-summary-top">
                <span className={`og-badge ${parsedData.type === 'income' ? 'og-badge--income' : 'og-badge--expense'}`}>
                  {parsedData.type === 'income' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                  {parsedData.type === 'income' ? 'Receita' : 'Despesa'}
                </span>
                <span className="og-voice-summary-amount">
                  {formatCurrency(parsedData.amount)}
                </span>
              </div>

              <h4 className="og-voice-summary-desc">{parsedData.description}</h4>

              <div className="og-voice-summary-tags">
                {parsedData.payment_method === 'credit_card' ? (
                  <span className="og-badge og-badge--primary">
                    <CreditCard size={12} /> Cartão de Crédito
                  </span>
                ) : (
                  <span className="og-badge">Dinheiro / Pix</span>
                )}
              </div>
            </div>

            {error && <p className="og-voice-error">{error}</p>}

            <div className="og-voice-actions">
              <button
                className="og-btn og-btn--secondary"
                onClick={() => setParsedData(null)}
                disabled={loading}
              >
                Falar Novamente
              </button>
              <button
                className="og-btn og-btn--primary"
                onClick={handleConfirmSave}
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Confirmar e Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VoiceTransactionModal;


/**
 * OrganizaGrana — AIImportSheet
 * Bottom-sheet para importação de transações via análise de imagens com GPT Vision.
 * Suporta receitas, despesas, detecção inteligente de vencimentos, cartões de crédito,
 * códigos de barras/pix e análise crítica de orçamento (Coach IA).
 */
import React, { useState, useRef, useCallback } from 'react';
import { analyzeImagesWithGPT } from '../../services/gpt.js';
import { getAllCategories } from '../../services/categories.js';
import { getAllCards } from '../../services/cards.js';
import { getFinancialContextSummary } from '../../services/financialContext.js';
import { getCategoryBudgets } from '../../services/budgets.js';
import { createTransaction } from '../../services/transactions.js';
import { parseCurrencyInput, formatCurrencyInput } from '../../utils/currency.js';
import './AIImportSheet.css';

// Sugestão de categorias por palavra-chave no category_hint da IA
const matchCategory = (hint, categories) => {
  if (!hint || !categories.length) return null;
  const h = hint.toLowerCase();
  return (
    categories.find((c) => c.name.toLowerCase() === h) ||
    categories.find((c) => c.name.toLowerCase().includes(h)) ||
    categories.find((c) => h.includes(c.name.toLowerCase())) ||
    null
  );
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── Etapas do fluxo ────────────────────────────────────────────────────────
const STEP_INPUT = 'input';
const STEP_LOADING = 'loading';
const STEP_REVIEW = 'review';
const STEP_DONE = 'done';
// ────────────────────────────────────────────────────────────────────────────

/** Converte string base64 / data URL em objeto File sem depender de fetch() */
const base64ToFile = (dataUrl, filename) => {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr.length > 1 ? arr[1] : arr[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return new File([blob], filename, { type: mime });
  } catch (err) {
    console.error('[AIImportSheet] Erro ao converter base64:', err);
    return null;
  }
};

const AIImportSheet = ({ onClose, onSave }) => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // --- Etapa atual ---
  const [step, setStep] = useState(STEP_INPUT);

  // --- Dados da etapa INPUT ---
  const [images, setImages] = useState([]); // [{ file, previewUrl }]
  const [transactionType, setType] = useState('expense'); // 'expense' | 'income' | 'auto'
  const [observations, setObservations] = useState('');

  // --- Dados de Contexto & Revisão ---
  const [reviewItems, setReviewItems] = useState([]); // items editáveis
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ---- Handlers de imagem ----
  const addImageFile = (file) => {
    if (!file) return;
    setImages((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, { file, previewUrl: URL.createObjectURL(file) }];
    });
  };

  const addImageFromBase64 = (base64Data, filenamePrefix = 'photo') => {
    const dataUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:image/jpeg;base64,${base64Data}`;
    const file = base64ToFile(dataUrl, `${filenamePrefix}_${Date.now()}.jpg`);
    if (!file) return;

    setImages((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, { file, previewUrl: dataUrl }];
    });
  };

  const handleCameraCapture = () => {
    if (window.navigator?.camera && window.Camera) {
      window.navigator.camera.getPicture(
        (base64Data) => {
          addImageFromBase64(base64Data, 'camera');
        },
        (err) => console.warn('[Camera] Cancelado/Erro:', err),
        {
          quality: 75,
          targetWidth: 1200,
          targetHeight: 1200,
          destinationType: window.Camera.DestinationType.DATA_URL,
          sourceType: window.Camera.PictureSourceType.CAMERA,
          encodingType: window.Camera.EncodingType.JPEG,
          correctOrientation: true,
        }
      );
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleGalleryPicker = () => {
    if (window.navigator?.camera && window.Camera) {
      window.navigator.camera.getPicture(
        (base64Data) => {
          addImageFromBase64(base64Data, 'gallery');
        },
        (err) => console.warn('[Gallery] Cancelado/Erro:', err),
        {
          quality: 75,
          targetWidth: 1200,
          targetHeight: 1200,
          destinationType: window.Camera.DestinationType.DATA_URL,
          sourceType: window.Camera.PictureSourceType.PHOTOLIBRARY,
          encodingType: window.Camera.EncodingType.JPEG,
        }
      );
    } else {
      galleryInputRef.current?.click();
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].previewUrl);
      next.splice(idx, 1);
      return next;
    });
  };

  // ---- Análise GPT ----
  const handleAnalyze = useCallback(async () => {
    if (!images.length) return;

    setStep(STEP_LOADING);
    setErrorMsg('');

    try {
      const [cats, userCards, finCtx, budgets] = await Promise.all([
        getAllCategories(),
        getAllCards(),
        getFinancialContextSummary().catch(() => null),
        getCategoryBudgets().catch(() => []),
      ]);

      setCategories(cats);
      setCards(userCards);

      // Prepara resumo de tetos orçamentários para alimentar a inteligência do Coach
      let budgetsSummary = '';
      if (budgets && budgets.length > 0) {
        budgetsSummary = budgets
          .filter((b) => b.budget_limit > 0)
          .map((b) => `${b.name}: limite R$ ${b.budget_limit.toFixed(2)} (gasto R$ ${b.current_spent.toFixed(2)} - ${b.percentage}%)`)
          .join(', ');
      }

      const enhancedContext = finCtx
        ? {
            ...finCtx,
            budgetsSummary,
          }
        : null;

      const items = await analyzeImagesWithGPT(
        images.map((i) => i.file),
        transactionType,
        observations,
        cats,
        userCards,
        enhancedContext
      );

      // Enriquece cada item com mapeamento preciso
      const enriched = items.map((item, idx) => {
        let catId = item.category_id;
        if (!catId) {
          const matched = matchCategory(item.category_hint, cats.filter((c) => c.type === item.type));
          catId = matched?.id || null;
        }

        // Verifica cartão correspondente
        let cardId = item.card_id;
        if (!cardId && item.payment_method === 'credit_card' && userCards.length > 0) {
          cardId = userCards[0].id;
        }

        return {
          _key: `item-${idx}`,
          description: item.description,
          amount: item.amount,
          amountStr: formatCurrencyInput(item.amount),
          type: item.type,
          category_id: catId,
          date: item.date || item.due_date || today(),
          due_date: item.due_date || null,
          status: item.status || 'paid',
          payment_method: item.payment_method || 'cash',
          card_id: cardId,
          payment_code: item.payment_code || '',
          financial_insight: item.financial_insight || null,
          include: true,
        };
      });

      setReviewItems(enriched);
      setStep(STEP_REVIEW);
    } catch (err) {
      setErrorMsg(err.message || 'Ocorreu um erro inesperado.');
      setStep(STEP_INPUT);
    }
  }, [images, transactionType, observations]);

  // ---- Edição inline dos itens ----
  const updateItem = (key, field, value) => {
    setReviewItems((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, [field]: value } : item
      )
    );
  };

  // ---- Salvar lançamentos confirmados ----
  const handleSave = async () => {
    const toSave = reviewItems.filter((i) => i.include);
    if (!toSave.length) return;

    setSaving(true);
    try {
      for (const item of toSave) {
        const amount = parseCurrencyInput(item.amountStr);
        if (amount <= 0) continue;

        const isCard = item.type === 'expense' && item.payment_method === 'credit_card';

        await createTransaction({
          description: item.description.trim(),
          amount,
          type: item.type,
          payment_method: isCard ? 'credit_card' : 'cash',
          card_id: isCard ? item.card_id : null,
          category_id: item.category_id || null,
          date: item.date || today(),
          is_recurring: 0,
          recurrence_type: null,
          installment_total: null,
          installment_months: null,
          notes: item.financial_insight ? `[Coach IA] ${item.financial_insight}` : 'Importado via IA',
          payment_code: item.payment_code?.trim() || null,
          status: item.type === 'income' ? 'paid' : item.status,
        });
      }
      setStep(STEP_DONE);
      setTimeout(() => {
        onSave?.();
        onClose?.();
      }, 1200);
    } catch (err) {
      console.error('[AIImportSheet] Erro ao salvar:', err);
      setErrorMsg('Erro ao salvar lançamentos. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const includedCount = reviewItems.filter((i) => i.include).length;

  return (
    <>
      <div className="og-sheet-overlay" onClick={onClose} />
      <div className="ai-sheet animate-slide-up">

        {/* Handle bar */}
        <div className="ai-sheet__handle-bar">
          <div className="og-sheet__handle" />
        </div>

        {/* ═══════════════ STEP: INPUT ═══════════════ */}
        {step === STEP_INPUT && (
          <div className="ai-sheet__content">
            <div className="ai-sheet__header">
              <span className="ai-sheet__header-icon">🤖</span>
              <div>
                <h2 className="ai-sheet__title">Importar com IA</h2>
                <p className="ai-sheet__subtitle">Tire foto do cupom, boleto ou extrato. A IA detecta valores, datas de vencimento e cartões.</p>
              </div>
            </div>

            {/* Tipo de transação */}
            <div className="ai-section">
              <label className="og-label">Tipo de lançamento</label>
              <div className="og-toggle-group">
                <button
                  className={`og-toggle-btn ${transactionType === 'expense' ? 'og-toggle-btn--active og-toggle-btn--expense' : ''}`}
                  onClick={() => setType('expense')}
                >💸 Despesa</button>
                <button
                  className={`og-toggle-btn ${transactionType === 'income' ? 'og-toggle-btn--active og-toggle-btn--income' : ''}`}
                  onClick={() => setType('income')}
                >💰 Receita</button>
                <button
                  className={`og-toggle-btn ${transactionType === 'auto' ? 'og-toggle-btn--active' : ''}`}
                  onClick={() => setType('auto')}
                >🔍 Auto</button>
              </div>
            </div>

            {/* Área de imagens */}
            <div className="ai-section">
              <label className="og-label">Imagens ({images.length}/3)</label>
              <div className="ai-images-grid">
                {images.map((img, idx) => (
                  <div key={idx} className="ai-image-thumb">
                    <img src={img.previewUrl} alt={`Imagem ${idx + 1}`} />
                    <button
                      className="ai-image-thumb__remove"
                      onClick={() => removeImage(idx)}
                    >✕</button>
                  </div>
                ))}
                {images.length < 3 && (
                  <>
                    <button className="ai-image-add" onClick={handleCameraCapture}>
                      <span className="ai-image-add__icon">📸</span>
                      <span className="ai-image-add__label">Câmera</span>
                    </button>
                    <button className="ai-image-add" onClick={handleGalleryPicker}>
                      <span className="ai-image-add__icon">🖼️</span>
                      <span className="ai-image-add__label">Galeria</span>
                    </button>
                  </>
                )}
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(addImageFile);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(addImageFile);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </div>

            {/* Observações */}
            <div className="ai-section">
              <label className="og-label">Observações para a IA <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
              <textarea
                className="og-input ai-textarea"
                placeholder={'Ex: "Pago no cartão Nubank", "Vence dia 15", "Considere apenas o total"'}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </div>

            {errorMsg && (
              <div className="ai-error">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <button
              className={`og-btn og-btn--primary og-btn--full og-btn--lg ${!images.length ? 'og-btn--disabled' : ''}`}
              onClick={handleAnalyze}
              disabled={!images.length}
            >
              ✨ Analisar com IA
            </button>
          </div>
        )}

        {/* ═══════════════ STEP: LOADING ═══════════════ */}
        {step === STEP_LOADING && (
          <div className="ai-sheet__content ai-loading">
            <div className="ai-loading__animation">
              <div className="ai-loading__ring" />
              <span className="ai-loading__icon">🤖</span>
            </div>
            <p className="ai-loading__title">Analisando com IA...</p>
            <p className="ai-loading__subtitle">Extraindo valores, datas de vencimento, cartões e analisando orçamento</p>
          </div>
        )}

        {/* ═══════════════ STEP: REVIEW ═══════════════ */}
        {step === STEP_REVIEW && (
          <div className="ai-sheet__content">
            <div className="ai-sheet__header">
              <span className="ai-sheet__header-icon">📋</span>
              <div>
                <h2 className="ai-sheet__title">Revisar lançamentos</h2>
                <p className="ai-sheet__subtitle">{reviewItems.length} item(s) identificado(s). Revise cartões, datas e categorias.</p>
              </div>
            </div>

            <div className="ai-review-list">
              {reviewItems.map((item) => (
                <div
                  key={item._key}
                  className={`ai-review-item ${!item.include ? 'ai-review-item--excluded' : ''}`}
                >
                  {/* Checkbox de inclusão */}
                  <label className="ai-review-item__check">
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={(e) => updateItem(item._key, 'include', e.target.checked)}
                    />
                    <span className="ai-review-item__checkmark" />
                  </label>

                  <div className="ai-review-item__body">
                    {/* Descrição */}
                    <input
                      className="ai-review-item__desc"
                      value={item.description}
                      onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                      disabled={!item.include}
                      placeholder="Descrição do lançamento"
                    />

                    {/* Valor e Tipo */}
                    <div className="ai-review-item__row-val">
                      <div className="ai-review-item__amount-input-wrap">
                        <span className="ai-review-item__currency">R$</span>
                        <input
                          className="ai-review-item__amount-field"
                          type="text"
                          inputMode="numeric"
                          value={item.amountStr}
                          onChange={(e) => updateItem(item._key, 'amountStr', formatCurrencyInput(e.target.value))}
                          disabled={!item.include}
                        />
                      </div>

                      <button
                        type="button"
                        className={`og-badge ${item.type === 'income' ? 'og-badge--income' : 'og-badge--expense'} clickable-type-badge`}
                        onClick={() => updateItem(item._key, 'type', item.type === 'income' ? 'expense' : 'income')}
                        disabled={!item.include}
                        title="Toque para alternar Receita / Despesa"
                      >
                        {item.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                      </button>
                    </div>

                    {/* Categoria */}
                    <div className="ai-review-field-group">
                      <span className="ai-review-field-label">Categoria:</span>
                      <select
                        className="ai-review-item__cat-select"
                        value={item.category_id || ''}
                        onChange={(e) => updateItem(item._key, 'category_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                        disabled={!item.include}
                      >
                        <option value="">Sem categoria</option>
                        {categories
                          .filter((c) => c.type === item.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Forma de Pagamento e Cartão (apenas para despesas) */}
                    {item.type === 'expense' && (
                      <div className="ai-review-field-group">
                        <span className="ai-review-field-label">Pagamento:</span>
                        <div className="ai-review-method-toggle">
                          <button
                            type="button"
                            className={`ai-method-btn ${item.payment_method === 'cash' ? 'active' : ''}`}
                            onClick={() => updateItem(item._key, 'payment_method', 'cash')}
                            disabled={!item.include}
                          >
                            Dinheiro/Pix
                          </button>
                          <button
                            type="button"
                            className={`ai-method-btn ${item.payment_method === 'credit_card' ? 'active' : ''}`}
                            onClick={() => {
                              updateItem(item._key, 'payment_method', 'credit_card');
                              if (!item.card_id && cards.length > 0) {
                                updateItem(item._key, 'card_id', cards[0].id);
                              }
                            }}
                            disabled={!item.include}
                          >
                            Cartão
                          </button>
                        </div>

                        {item.payment_method === 'credit_card' && cards.length > 0 && (
                          <select
                            className="ai-review-item__card-select"
                            value={item.card_id || cards[0].id}
                            onChange={(e) => updateItem(item._key, 'card_id', parseInt(e.target.value, 10))}
                            disabled={!item.include}
                          >
                            {cards.map((card) => (
                              <option key={card.id} value={card.id}>
                                💳 {card.name} {card.last_digits ? `(•••• ${card.last_digits})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Status & Data / Vencimento */}
                    <div className="ai-review-field-group">
                      <span className="ai-review-field-label">
                        {item.status === 'pending' ? 'Vencimento:' : 'Data:'}
                      </span>
                      <input
                        className="ai-review-item__date"
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItem(item._key, 'date', e.target.value)}
                        disabled={!item.include}
                      />

                      {item.type === 'expense' && (
                        <button
                          type="button"
                          className={`ai-status-pill ${item.status === 'pending' ? 'status--pending' : 'status--paid'}`}
                          onClick={() => updateItem(item._key, 'status', item.status === 'pending' ? 'paid' : 'pending')}
                          disabled={!item.include}
                        >
                          {item.status === 'pending' ? '⏳ A Pagar' : '✅ Pago'}
                        </button>
                      )}
                    </div>

                    {/* Código de Pagamento / Boleto / Pix (se identificado) */}
                    {item.payment_code && (
                      <div className="ai-review-code-box">
                        <span className="ai-review-code-label">Código / Pix detectado:</span>
                        <input
                          className="ai-review-code-input"
                          value={item.payment_code}
                          onChange={(e) => updateItem(item._key, 'payment_code', e.target.value)}
                          disabled={!item.include}
                        />
                      </div>
                    )}

                    {/* Insight / Questionamento do Coach Financeiro */}
                    {item.financial_insight && item.include && (
                      <div className="ai-coach-insight-card">
                        <div className="ai-coach-insight-header">
                          <span className="ai-coach-insight-badge">Coach IA</span>
                        </div>
                        <p className="ai-coach-insight-text">
                          {item.financial_insight}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="ai-error">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <div className="ai-review-actions">
              <button
                className="og-btn og-btn--secondary"
                onClick={() => { setStep(STEP_INPUT); setErrorMsg(''); }}
                disabled={saving}
              >
                ← Voltar
              </button>
              <button
                className={`og-btn og-btn--primary ${saving || !includedCount ? 'og-btn--disabled' : ''}`}
                onClick={handleSave}
                disabled={saving || !includedCount}
              >
                {saving ? '⏳ Salvando...' : `Importar ${includedCount} lançamento(s)`}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: DONE ═══════════════ */}
        {step === STEP_DONE && (
          <div className="ai-sheet__content ai-done">
            <div className="ai-done__icon">🎉</div>
            <p className="ai-done__title">Lançamentos importados!</p>
            <p className="ai-done__subtitle">Os dados e classificações foram salvos com sucesso.</p>
          </div>
        )}

      </div>
    </>
  );
};

export default AIImportSheet;

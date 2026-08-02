/**
 * OrganizaGrana — AIImportSheet
 * Bottom-sheet para importação de transações via análise de imagens com GPT Vision.
 * Suporta receitas e despesas.
 *
 * Fluxo: Seleção de imagens → Observações → Análise GPT → Revisão → Salvar
 */
import React, { useState, useRef, useCallback } from 'react';
import { analyzeImagesWithGPT } from '../../services/gpt.js';
import { getAllCategories } from '../../services/categories.js';
import { createTransaction } from '../../services/transactions.js';
import { parseCurrencyInput, formatCurrencyInput } from '../../utils/currency.js';
import './AIImportSheet.css';

// Sugestão de categorias por palavra-chave no category_hint da IA
const matchCategory = (hint, categories) => {
  if (!hint || !categories.length) return null;
  const h = hint.toLowerCase();
  return (
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

  // --- Dados da etapa REVIEW ---
  const [reviewItems, setReviewItems] = useState([]); // items editáveis
  const [categories, setCategories] = useState([]);
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
      const cats = await getAllCategories();
      setCategories(cats);

      const items = await analyzeImagesWithGPT(
        images.map((i) => i.file),
        transactionType,
        observations,
        cats
      );

      // Enriquece cada item com category_id sugerido e campos editáveis
      const enriched = items.map((item, idx) => {
        const matchingCat = matchCategory(item.category_hint, cats.filter((c) => c.type === item.type));
        return {
          _key: `item-${idx}`,
          description: item.description,
          amount: item.amount,
          amountStr: formatCurrencyInput(item.amount),
          type: item.type,
          category_id: matchingCat?.id || null,
          category_name: matchingCat?.name || item.category_hint || '',
          date: item.date || today(),
          include: true, // o usuário pode desmarcar
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

        await createTransaction({
          description: item.description,
          amount,
          type: item.type,
          payment_method: 'cash',
          card_id: null,
          category_id: item.category_id || null,
          date: item.date || today(),
          is_recurring: 0,
          recurrence_type: null,
          installment_total: null,
          installment_months: null,
          notes: 'Importado via IA',
        });
      }
      setStep(STEP_DONE);
      setTimeout(() => {
        onSave?.();
        onClose?.();
      }, 1200);
    } catch (err) {
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

        {/* Handle + Título */}
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
                <p className="ai-sheet__subtitle">Tire foto do comprovante e deixe a IA extrair os dados</p>
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
              {/* Input fallback para Câmera */}
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
              {/* Input fallback para Galeria */}
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
                placeholder={'Ex: "Considere apenas o subtotal"\n"Ignore a taxa de entrega"\n"Divida em 3 parcelas"'}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </div>

            {/* Erro */}
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
            <p className="ai-loading__subtitle">Extraindo dados financeiros da sua imagem</p>
          </div>
        )}

        {/* ═══════════════ STEP: REVIEW ═══════════════ */}
        {step === STEP_REVIEW && (
          <div className="ai-sheet__content">
            <div className="ai-sheet__header">
              <span className="ai-sheet__header-icon">✅</span>
              <div>
                <h2 className="ai-sheet__title">Revisar lançamentos</h2>
                <p className="ai-sheet__subtitle">{reviewItems.length} item(s) identificado(s). Edite ou desmarque antes de importar.</p>
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
                    {/* Descrição editável */}
                    <input
                      className="ai-review-item__desc"
                      value={item.description}
                      onChange={(e) => updateItem(item._key, 'description', e.target.value)}
                      disabled={!item.include}
                    />

                    <div className="ai-review-item__meta">
                      {/* Badge tipo */}
                      <span className={`og-badge ${item.type === 'income' ? 'og-badge--income' : 'og-badge--expense'}`}>
                        {item.type === 'income' ? '↑ Receita' : '↓ Despesa'}
                      </span>

                      {/* Seletor de Categoria */}
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

                    {/* Data editável */}
                    <input
                      className="ai-review-item__date"
                      type="date"
                      value={item.date}
                      onChange={(e) => updateItem(item._key, 'date', e.target.value)}
                      disabled={!item.include}
                    />
                  </div>

                  {/* Valor editável com máscara BR */}
                  <div className="ai-review-item__amount-wrap">
                    <span className="ai-review-item__currency">R$</span>
                    <input
                      className="ai-review-item__amount"
                      type="text"
                      inputMode="numeric"
                      value={item.amountStr}
                      onChange={(e) => updateItem(item._key, 'amountStr', formatCurrencyInput(e.target.value))}
                      disabled={!item.include}
                    />
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
                {saving ? '⏳ Salvando...' : `✅ Importar ${includedCount}`}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: DONE ═══════════════ */}
        {step === STEP_DONE && (
          <div className="ai-sheet__content ai-done">
            <div className="ai-done__icon">🎉</div>
            <p className="ai-done__title">Lançamentos importados!</p>
            <p className="ai-done__subtitle">Os dados foram salvos com sucesso.</p>
          </div>
        )}

      </div>
    </>
  );
};

export default AIImportSheet;

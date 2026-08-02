/**
 * OrganizaGrana — ShoppingListDetail
 * Tela de execução da lista de compras em tempo real (no supermercado).
 * Recursos: Busca em tempo real, Leitura por foto com fallback, Lançamento Avulso Rápido e Preço Unitário.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import {
  getShoppingListById,
  getShoppingListItems,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  updateShoppingList,
} from '../../services/shopping.js';
import { getUserConfig } from '../../services/user.js';
import { extractPriceFromImage } from '../../services/gpt.js';
import { formatCurrency } from '../../utils/currency.js';
import QuickPriceModal from '../../components/shopping/QuickPriceModal.jsx';
import QuickMultiAddModal from '../../components/shopping/QuickMultiAddModal.jsx';
import TransactionForm from '../../components/forms/TransactionForm.jsx';
import './ShoppingListDetail.css';

const ShoppingListDetail = ({ listId, onBack }) => {
  const { showToast } = useApp();

  const [list, setList]                 = useState(null);
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [newItemName, setNewItemName]   = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [gptEnabled, setGptEnabled]     = useState(false);

  // Modais
  const [editPriceItem, setEditPriceItem] = useState(null);
  const [showMultiAdd, setShowMultiAdd]   = useState(false);
  const [showForm, setShowForm]           = useState(false);

  // Ref para input de foto fallback
  const fileInputRef = useRef(null);
  const [currentCameraItem, setCurrentCameraItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [l, itms, user] = await Promise.all([
        getShoppingListById(listId),
        getShoppingListItems(listId),
        getUserConfig(),
      ]);
      setList(l);
      setItems(itms);
      setGptEnabled(Boolean(user?.gpt_enabled && user?.gpt_api_key));
    } catch (err) {
      console.error('[ShoppingListDetail] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Adicionar Novo Item Simples ----
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await addShoppingListItem(listId, newItemName.trim(), 1, 0);
      setNewItemName('');
      await loadData();
    } catch (err) {
      showToast('Erro ao adicionar item.', 'error');
    }
  };

  // ---- Adicionar Item Avulso Múltiplo ----
  const handleSaveMultiAdd = async ({ name, total_amount, unit_price, quantity }) => {
    try {
      await addShoppingListItem(listId, name, quantity, unit_price);
      const updatedItems = await getShoppingListItems(listId);
      const newItem = updatedItems.find((i) => i.name === name);
      if (newItem) {
        await updateShoppingListItem(newItem.id, listId, { is_checked: 1 });
      }
      setShowMultiAdd(false);
      await loadData();
      showToast('Item avulso adicionado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao adicionar item avulso.', 'error');
    }
  };

  // ---- Toggle Checkbox ----
  const handleToggleCheck = async (item) => {
    try {
      await updateShoppingListItem(item.id, listId, { is_checked: !item.is_checked });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Alterar Quantidade ----
  const handleUpdateQty = async (item, delta) => {
    const newQty = Math.max(1, item.quantity + delta);
    if (newQty === item.quantity) return;
    try {
      await updateShoppingListItem(item.id, listId, { quantity: newQty });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Excluir Item ----
  const handleDeleteItem = async (itemId) => {
    try {
      await deleteShoppingListItem(itemId, listId);
      await loadData();
    } catch (err) {
      showToast('Erro ao excluir item.', 'error');
    }
  };

  // ---- Capturar Preço via Câmera/IA ----
  const handleCameraPrice = (item) => {
    if (!gptEnabled) {
      showToast('Para ler preços por foto, ative e informe sua API Key em Configurações.', 'warning');
      return;
    }

    setCurrentCameraItem(item);

    // Usa plugin Cordova se nativamente disponível
    if (typeof navigator !== 'undefined' && navigator.camera && window.Camera) {
      navigator.camera.getPicture(
        (base64Data) => processCameraImage(item, base64Data),
        (err) => console.warn('[Camera] Cancelado:', err),
        {
          quality: 80,
          targetWidth: 1000,
          targetHeight: 1000,
          destinationType: window.Camera.DestinationType.DATA_URL,
          sourceType: window.Camera.PictureSourceType.CAMERA,
          encodingType: window.Camera.EncodingType.JPEG,
          correctOrientation: true,
        }
      );
      return;
    }

    // Fallback Web/Mobile com input file
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentCameraItem) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      const base64Data = dataUrl.split(',')[1] || dataUrl;
      await processCameraImage(currentCameraItem, base64Data);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const processCameraImage = async (item, base64Data) => {
    showToast('Lendo preço da foto com a IA...', 'info');
    try {
      const extractedPrice = await extractPriceFromImage(base64Data);
      await updateShoppingListItem(item.id, listId, {
        unit_price: extractedPrice,
        is_checked: 1,
      });
      await loadData();
      showToast(`Preço lido: ${formatCurrency(extractedPrice)}`, 'success');
    } catch (err) {
      showToast(err.message || 'Não foi possível identificar o preço na foto.', 'error');
    }
  };

  // ---- Finalizar Lista ----
  const handleFinishList = () => {
    if (list?.total_amount <= 0) {
      showToast('Adicione e marque o preço dos itens antes de finalizar.', 'warning');
      return;
    }
    setShowForm(true);
  };

  const handleSaveTransaction = async () => {
    try {
      await updateShoppingList(listId, { status: 'completed' });
      showToast('Compras finalizadas e lançadas no extrato!', 'success');
      setShowForm(false);
      onBack();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !list) {
    return (
      <div className="og-page">
        <div className="og-page-header">
          <button className="og-back-btn" onClick={onBack} aria-label="Voltar">←</button>
        </div>
        <div className="og-scrollable og-page-content">
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  const checkedCount = items.filter((i) => i.is_checked === 1).length;
  const totalItemsCount = items.length;
  const progressPercent = totalItemsCount > 0 ? (checkedCount / totalItemsCount) * 100 : 0;

  // Filtragem por busca
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="og-page shopping-detail-page">
      {/* Hidden File Input Fallback for Camera */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div className="shopping-detail-header">
        <div className="shopping-detail-header__top">
          <div className="shopping-detail-header__title-wrap">
            <button className="og-back-btn" onClick={onBack} aria-label="Voltar">←</button>
            <h1 className="shopping-detail-title">{list.name}</h1>
          </div>

          <button
            type="button"
            className={`shopping-finish-btn ${list.total_amount <= 0 ? 'shopping-finish-btn--disabled' : ''}`}
            onClick={handleFinishList}
            disabled={list.total_amount <= 0}
            title="Finalizar e lançar despesa no extrato"
          >
            ✓ {formatCurrency(list.total_amount || 0)}
          </button>
        </div>

        {/* Barra de Progresso */}
        <div className="shopping-detail-progress-wrap">
          <div className="shopping-detail-progress-info">
            <span>{checkedCount} de {totalItemsCount} no carrinho</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="shopping-detail-progress-track">
            <div className="shopping-detail-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="og-scrollable og-page-content">
        {/* Campo de Pesquisa */}
        <div className="shopping-search-bar">
          <span className="shopping-search-icon">🔍</span>
          <input
            className="og-input shopping-search-input"
            placeholder="Buscar item na lista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="shopping-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Formulário de Adicionar Item + Botão Add Avulso */}
        <form className="shopping-add-form" onSubmit={handleAddItem}>
          <input
            className="og-input shopping-add-input"
            placeholder="Adicionar item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          <button type="submit" className="og-btn og-btn--primary shopping-add-btn" title="Adicionar Item">
            +
          </button>
          <button
            type="button"
            className="og-btn og-btn--outline shopping-multi-btn"
            onClick={() => setShowMultiAdd(true)}
            title="Lançar múltiplos valores avulsos"
          >
            ⚡ Add Avulso
          </button>
        </form>

        {/* Lista de Itens */}
        {filteredItems.length === 0 ? (
          <div className="og-empty-state">
            <div className="og-empty-state__emoji">{searchQuery ? '🔍' : '🛒'}</div>
            <p className="og-empty-state__title">{searchQuery ? 'Nenhum item encontrado' : 'Lista vazia'}</p>
            <p className="og-empty-state__subtitle">
              {searchQuery ? `Não encontramos "${searchQuery}" nesta lista.` : 'Adicione os itens acima para começar suas compras.'}
            </p>
          </div>
        ) : (
          <div className="shopping-items-list">
            {filteredItems.map((item) => {
              const itemTotal = item.quantity * item.unit_price;
              return (
                <div
                  key={item.id}
                  className={`shopping-item-card ${item.is_checked ? 'shopping-item-card--checked' : ''}`}
                >
                  {/* Checkbox */}
                  <label className="shopping-item-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(item.is_checked)}
                      onChange={() => handleToggleCheck(item)}
                    />
                    <span className="shopping-item-checkmark" />
                  </label>

                  {/* Info do Item */}
                  <div className="shopping-item-info" onClick={() => handleToggleCheck(item)}>
                    <p className="shopping-item-name">{item.name}</p>
                    <div className="shopping-item-sub">
                      <span className="shopping-item-unit-price">
                        {itemTotal > 0 ? formatCurrency(itemTotal) : 'Sem preço'}
                      </span>
                      {item.quantity > 1 && item.unit_price > 0 && (
                        <span className="shopping-item-sub-unit">
                          ({formatCurrency(item.unit_price)}/un)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações do Item */}
                  <div className="shopping-item-actions">
                    {/* Alterar Qtd */}
                    <div className="shopping-item-qty-control">
                      <button
                        type="button"
                        className="shopping-item-qty-btn"
                        onClick={() => handleUpdateQty(item, -1)}
                      >-</button>
                      <span className="shopping-item-qty">{item.quantity}</span>
                      <button
                        type="button"
                        className="shopping-item-qty-btn"
                        onClick={() => handleUpdateQty(item, 1)}
                      >+</button>
                    </div>

                    {/* Botão de Ajuste de Preço */}
                    <button
                      type="button"
                      className="shopping-item-action-btn"
                      onClick={() => setEditPriceItem(item)}
                      title="Digitar preço"
                    >💲</button>

                    {/* Botão de Câmera IA com status de habilitação */}
                    <button
                      type="button"
                      className={`shopping-item-action-btn ${!gptEnabled ? 'shopping-item-action-btn--disabled' : ''}`}
                      onClick={() => handleCameraPrice(item)}
                      title={gptEnabled ? 'Ler preço por Foto/Câmera' : 'Integração IA desativada'}
                    >📷</button>

                    {/* Excluir */}
                    <button
                      type="button"
                      className="shopping-item-delete-btn"
                      onClick={() => handleDeleteItem(item.id)}
                    >🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Preço Rápido */}
      {editPriceItem && (
        <QuickPriceModal
          item={editPriceItem}
          onClose={() => setEditPriceItem(null)}
          onSave={async ({ unit_price, quantity }) => {
            await updateShoppingListItem(editPriceItem.id, listId, {
              unit_price,
              quantity,
              is_checked: 1,
            });
            setEditPriceItem(null);
            await loadData();
          }}
        />
      )}

      {/* Modal de Lançamento Avulso Rápido */}
      {showMultiAdd && (
        <QuickMultiAddModal
          onClose={() => setShowMultiAdd(false)}
          onSave={handleSaveMultiAdd}
        />
      )}

      {/* Form de Lançamento no Extrato */}
      {showForm && (
        <TransactionForm
          initialType="expense"
          editData={{
            type: 'expense',
            amount: list.total_amount,
            description: `Compras: ${list.name}`,
            date: new Date().toISOString().split('T')[0],
          }}
          onSave={handleSaveTransaction}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default ShoppingListDetail;

/**
 * OrganizaGrana — ShoppingListsPage
 * Gerenciador de listas de compras.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import {
  getAllShoppingLists,
  createShoppingList,
  deleteShoppingList,
} from '../../services/shopping.js';
import { formatCurrency } from '../../utils/currency.js';
import ShoppingListDetail from './ShoppingListDetail.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import './ShoppingListsPage.css';

const ShoppingListsPage = ({ onClose }) => {
  const { showToast } = useApp();

  const [lists, setLists]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedListId, setSelectedListId] = useState(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName]   = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, list: null });

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllShoppingLists();
      setLists(data);
    } catch (err) {
      console.error('[ShoppingListsPage] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const newId = await createShoppingList(newListName.trim());
      setNewListName('');
      setShowNewListModal(false);
      await loadLists();
      setSelectedListId(newId); // abre direto a nova lista!
    } catch (err) {
      showToast('Erro ao criar lista.', 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!deleteConfirm.list) return;
    try {
      await deleteShoppingList(deleteConfirm.list.id);
      setDeleteConfirm({ open: false, list: null });
      showToast('Lista excluída.', 'success');
      loadLists();
    } catch (err) {
      showToast('Erro ao excluir lista.', 'error');
    }
  };

  // Se uma lista foi aberta, exibe o detalhe dela!
  if (selectedListId) {
    return (
      <ShoppingListDetail
        listId={selectedListId}
        onBack={() => {
          setSelectedListId(null);
          loadLists();
        }}
      />
    );
  }

  const activeLists = lists.filter((l) => l.status === 'active');
  const completedLists = lists.filter((l) => l.status === 'completed');

  return (
    <div className="og-page shopping-lists-page">
      {/* Header */}
      <div className="og-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {onClose && (
            <button className="og-back-btn" onClick={onClose} aria-label="Voltar">
              ←
            </button>
          )}
          <div>
            <h1 className="og-page-header__title">Listas de Compras</h1>
            <p className="og-page-header__subtitle">Planeje e controle suas compras no mercado</p>
          </div>
        </div>
        <button
          className="og-btn og-btn--primary og-btn--sm"
          onClick={() => setShowNewListModal(true)}
        >
          + Nova Lista
        </button>
      </div>

      <div className="og-scrollable og-page-content">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))
        ) : lists.length === 0 ? (
          <div className="og-empty-state">
            <div className="og-empty-state__emoji">🛒</div>
            <p className="og-empty-state__title">Nenhuma lista de compras</p>
            <p className="og-empty-state__subtitle">Crie sua primeira lista para organizar as compras no supermercado.</p>
            <button
              className="og-btn og-btn--primary"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => setShowNewListModal(true)}
            >
              + Criar Lista de Compras
            </button>
          </div>
        ) : (
          <>
            {/* Listas Ativas */}
            {activeLists.length > 0 && (
              <div className="shopping-lists-section">
                <p className="shopping-lists-section__title">LISTAS ATIVAS ({activeLists.length})</p>
                <div className="shopping-lists-grid">
                  {activeLists.map((list) => (
                    <div
                      key={list.id}
                      className="shopping-list-card"
                      onClick={() => setSelectedListId(list.id)}
                    >
                      <div className="shopping-list-card__header">
                        <div>
                          <h3 className="shopping-list-card__title">{list.name}</h3>
                          <p className="shopping-list-card__subtitle">
                            {list.checked_items || 0} de {list.total_items || 0} itens no carrinho
                          </p>
                        </div>
                        <button
                          className="shopping-list-card__delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, list });
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="shopping-list-card__footer">
                        <span className="og-badge og-badge--primary">🛒 Em andamento</span>
                        <span className="shopping-list-card__amount">
                          {formatCurrency(list.total_amount || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listas Concluídas */}
            {completedLists.length > 0 && (
              <div className="shopping-lists-section" style={{ marginTop: 'var(--space-4)' }}>
                <p className="shopping-lists-section__title">CONCLUÍDAS ({completedLists.length})</p>
                <div className="shopping-lists-grid">
                  {completedLists.map((list) => (
                    <div
                      key={list.id}
                      className="shopping-list-card shopping-list-card--completed"
                      onClick={() => setSelectedListId(list.id)}
                    >
                      <div className="shopping-list-card__header">
                        <div>
                          <h3 className="shopping-list-card__title">{list.name}</h3>
                          <p className="shopping-list-card__subtitle">
                            Concluída · {list.total_items || 0} itens
                          </p>
                        </div>
                        <button
                          className="shopping-list-card__delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, list });
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="shopping-list-card__footer">
                        <span className="og-badge og-badge--income">✅ Lançada no extrato</span>
                        <span className="shopping-list-card__amount">
                          {formatCurrency(list.total_amount || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nova Lista */}
      {showNewListModal && (
        <>
          <div className="og-sheet-overlay" onClick={() => setShowNewListModal(false)} />
          <div className="og-sheet animate-slide-up">
            <div className="og-sheet__handle" />
            <h2 className="og-sheet__title">Nova Lista de Compras</h2>
            <form onSubmit={handleCreateList}>
              <div className="og-input-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="og-label">Nome da Lista *</label>
                <input
                  className="og-input"
                  placeholder="Ex: Supermercado Mensal, Feira, Churrasco..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="og-btn og-btn--primary og-btn--full og-btn--lg">
                Criar Lista
              </button>
            </form>
          </div>
        </>
      )}

      {/* Modal Confirmação Deleção */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onCancel={() => setDeleteConfirm({ open: false, list: null })}
        icon="🗑️"
        title="Excluir lista de compras?"
        message={`A lista "${deleteConfirm.list?.name}" e todos os seus itens serão excluídos.`}
        actions={[
          {
            label: 'Excluir Lista',
            variant: 'danger',
            onClick: handleDeleteList,
          },
        ]}
      />
    </div>
  );
};

export default ShoppingListsPage;

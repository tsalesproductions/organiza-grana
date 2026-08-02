/**
 * OrganizaGrana — Página de Configurações
 * Gerencia: dados do usuário (nome), categorias, notificações e info do app.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { getUserConfig, updateUserName, updateGptConfig } from '../../services/user.js';
import { getAllCategories, createCategory, updateCategory, deleteCategory, AVAILABLE_ICONS, CATEGORY_COLORS } from '../../services/categories.js';
import { getNotificationConfig, updateNotificationConfig } from '../../services/notifications.js';
import './SettingsPage.css';

const SettingsPage = () => {
  const { showToast } = useApp();
  const [activeSection, setActiveSection] = useState(null); // null | 'categories' | 'notifications' | 'user'

  // Dados do usuário
  const [name, setName]             = useState('');
  const [userLoaded, setUserLoaded] = useState(false);

  // GPT Integration
  const [gptEnabled, setGptEnabled] = useState(false);
  const [gptApiKey, setGptApiKey]   = useState('');

  // Categorias
  const [categories, setCategories] = useState([]);
  const [catTypeFilter, setCatTypeFilter] = useState('expense');
  const [catForm, setCatForm]       = useState(null); // null | { name, icon, color, type }
  const [editCatId, setEditCatId]   = useState(null);

  // Notificações
  const [notifConfig, setNotifConfig] = useState([]);

  const loadUser = useCallback(async () => {
    const user = await getUserConfig();
    if (user) {
      if (user.name) setName(user.name);
      setGptEnabled(user.gpt_enabled === 1);
      setGptApiKey(user.gpt_api_key || '');
    }
    setUserLoaded(true);
  }, []);

  const loadCategories = useCallback(async () => {
    const cats = await getAllCategories();
    setCategories(cats);
  }, []);

  const loadNotifConfig = useCallback(async () => {
    const configs = await getNotificationConfig();
    setNotifConfig(configs);
  }, []);

  useEffect(() => {
    loadUser();
    loadCategories();
    loadNotifConfig();
  }, []);

  // ---- Handlers de usuário ----
  const handleSaveName = async () => {
    if (!name.trim()) return;
    try {
      await updateUserName(name.trim());
      showToast('Nome atualizado!', 'success');
      setActiveSection(null);
    } catch (err) {
      showToast('Erro ao salvar.', 'error');
    }
  };

  // ---- Handlers de GPT ----
  const handleToggleGpt = async (e) => {
    const enabled = e.target.checked;
    setGptEnabled(enabled);
    try {
      await updateGptConfig(enabled, gptApiKey);
      showToast(enabled ? 'Integração GPT ativada!' : 'Integração GPT desativada.', 'info');
    } catch (err) {
      showToast('Erro ao atualizar integração.', 'error');
    }
  };

  const handleSaveGptKey = async () => {
    try {
      await updateGptConfig(gptEnabled, gptApiKey.trim());
      showToast('Chave API do GPT salva com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar Chave API.', 'error');
    }
  };

  // ---- Handlers de categorias ----
  const handleSaveCat = async () => {
    if (!catForm?.name || !catForm?.icon || !catForm?.color) {
      showToast('Preencha todos os campos da categoria.', 'warning');
      return;
    }
    try {
      if (editCatId) {
        await updateCategory(editCatId, catForm);
        showToast('Categoria atualizada!', 'success');
      } else {
        await createCategory({ ...catForm, type: catTypeFilter });
        showToast('Categoria criada!', 'success');
      }
      setCatForm(null);
      setEditCatId(null);
      loadCategories();
    } catch (err) {
      showToast('Erro ao salvar categoria.', 'error');
    }
  };

  const handleDeleteCat = async (cat) => {
    if (cat.is_default) { showToast('Categorias padrão não podem ser excluídas.', 'warning'); return; }
    if (!window.confirm(`Excluir "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      showToast('Categoria excluída.', 'success');
      loadCategories();
    } catch (err) {
      showToast(err.message || 'Erro ao excluir.', 'error');
    }
  };

  // ---- Handlers de notificações ----
  const handleToggleNotif = async (config) => {
    const updated = { ...config, enabled: config.enabled === 1 ? 0 : 1 };
    await updateNotificationConfig(config.id, updated);
    showToast(updated.enabled ? 'Lembretes de vencimento ativados!' : 'Lembretes desativados.', 'info');
    loadNotifConfig();
  };

  const handleUpdateNotifDays = async (config, days) => {
    const updated = { ...config, days_before: days };
    await updateNotificationConfig(config.id, updated);
    showToast(`Aviso alterado para ${days} dias antes.`, 'success');
    loadNotifConfig();
  };

  const filteredCats = categories.filter((c) => c.type === catTypeFilter);

  return (
    <div className="og-page">
      <div className="og-page-header">
        <h1 className="og-page-header__title">Configurações</h1>
      </div>

      <div className="og-scrollable">

        {/* ---- Dados do Usuário ---- */}
        <div className="settings-section">
          <p className="settings-section__title">CONTA</p>
          <div className="og-card">
            <div
              className="og-settings-item"
              onClick={() => setActiveSection(activeSection === 'user' ? null : 'user')}
            >
              <div className="og-settings-item__left">
                <div className="og-settings-item__icon">👤</div>
                <div>
                  <p className="og-settings-item__title">Meu Nome</p>
                  {userLoaded && <p className="og-settings-item__subtitle">{name || 'Não definido'}</p>}
                </div>
              </div>
              <span className="og-settings-item__chevron">{activeSection === 'user' ? '▼' : '›'}</span>
            </div>
            {activeSection === 'user' && (
              <div style={{ padding: 'var(--space-4)' }}>
                <input
                  className="og-input"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoCapitalize="words"
                  style={{ marginBottom: 'var(--space-3)' }}
                />
                <button className="og-btn og-btn--primary og-btn--full" onClick={handleSaveName}>
                  Salvar Nome
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---- Categorias ---- */}
        <div className="settings-section">
          <p className="settings-section__title">CATEGORIAS</p>
          <div className="og-card">
            <div
              className="og-settings-item"
              onClick={() => setActiveSection(activeSection === 'categories' ? null : 'categories')}
            >
              <div className="og-settings-item__left">
                <div className="og-settings-item__icon">🏷️</div>
                <div>
                  <p className="og-settings-item__title">Gerenciar Categorias</p>
                  <p className="og-settings-item__subtitle">{categories.length} categorias</p>
                </div>
              </div>
              <span className="og-settings-item__chevron">{activeSection === 'categories' ? '▼' : '›'}</span>
            </div>

            {activeSection === 'categories' && (
              <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                {/* Filtro por tipo */}
                <div className="og-toggle-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <button
                    className={`og-toggle-btn ${catTypeFilter === 'expense' ? 'og-toggle-btn--active og-toggle-btn--expense' : ''}`}
                    onClick={() => setCatTypeFilter('expense')}
                  >Despesas</button>
                  <button
                    className={`og-toggle-btn ${catTypeFilter === 'income' ? 'og-toggle-btn--active og-toggle-btn--income' : ''}`}
                    onClick={() => setCatTypeFilter('income')}
                  >Receitas</button>
                </div>

                {/* Lista */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredCats.map((cat) => (
                    <div key={cat.id} className="settings-category-item">
                      <div
                        className="og-category-icon"
                        style={{ background: `${cat.color}22`, color: cat.color }}
                      >
                        {cat.icon}
                      </div>
                      <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                        {cat.name}
                        {cat.is_default === 1 && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 6 }}>(padrão)</span>
                        )}
                      </span>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        onClick={() => { setEditCatId(cat.id); setCatForm({ name: cat.name, icon: cat.icon, color: cat.color }); }}
                      >✏️</button>
                      {!cat.is_default && (
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                          onClick={() => handleDeleteCat(cat)}
                        >🗑️</button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  className="og-btn og-btn--secondary og-btn--full"
                  style={{ marginTop: 'var(--space-3)' }}
                  onClick={() => { setCatForm({ name: '', icon: '📌', color: '#6C5CE7' }); setEditCatId(null); }}
                >
                  + Nova Categoria
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---- Integração GPT ---- */}
        <div className="settings-section">
          <p className="settings-section__title">INTEGRAÇÃO COM IA (GPT)</p>
          <div className="og-card">
            <div className="og-settings-item">
              <div className="og-settings-item__left">
                <div className="og-settings-item__icon">🤖</div>
                <div>
                  <p className="og-settings-item__title">Ativar OpenAI GPT</p>
                  <p className="og-settings-item__subtitle">
                    {gptEnabled ? 'Integração ativa' : 'Desativado'}
                  </p>
                </div>
              </div>
              <label className="og-switch">
                <input
                  type="checkbox"
                  checked={gptEnabled}
                  onChange={handleToggleGpt}
                />
                <div className="og-switch__track" />
              </label>
            </div>

            {gptEnabled && (
              <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border-light)' }}>
                <div className="og-input-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="og-label">API Key do OpenAI</label>
                  <input
                    className="og-input"
                    type="password"
                    placeholder="sk-..."
                    value={gptApiKey}
                    onChange={(e) => setGptApiKey(e.target.value)}
                  />
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Sua chave é armazenada de forma segura no seu dispositivo.
                  </p>
                </div>
                <button className="og-btn og-btn--primary og-btn--full" onClick={handleSaveGptKey}>
                  Salvar Chave API
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---- Notificações ---- */}
        <div className="settings-section">
          <p className="settings-section__title">NOTIFICAÇÕES DE VENCIMENTO</p>
          <div className="og-card">
            {notifConfig.map((config) => (
              <React.Fragment key={config.id}>
                <div className="og-settings-item">
                  <div className="og-settings-item__left">
                    <div className="og-settings-item__icon">🔔</div>
                    <div>
                      <p className="og-settings-item__title">
                        {config.type === 'card_due' ? 'Faturas e Contas' : 'Outros lembretes'}
                      </p>
                      <p className="og-settings-item__subtitle">
                        {config.enabled ? `Avisar ${config.days_before} ${config.days_before === 1 ? 'dia' : 'dias'} antes do vencimento` : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <label className="og-switch">
                    <input
                      type="checkbox"
                      checked={config.enabled === 1}
                      onChange={() => handleToggleNotif(config)}
                    />
                    <div className="og-switch__track" />
                  </label>
                </div>

                {config.enabled === 1 && (
                  <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Avisar antecedência:</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 3, 5].map((days) => (
                        <button
                          key={days}
                          type="button"
                          className={`og-badge ${config.days_before === days ? 'og-badge--income' : ''}`}
                          style={{ cursor: 'pointer', border: '1px solid var(--color-border)', background: config.days_before === days ? undefined : 'var(--color-surface)' }}
                          onClick={() => handleUpdateNotifDays(config, days)}
                        >
                          {days} {days === 1 ? 'dia' : 'dias'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ---- Sobre ---- */}
        <div className="settings-section">
          <p className="settings-section__title">SOBRE</p>
          <div className="og-card">
            <div className="og-settings-item" style={{ cursor: 'default' }}>
              <div className="og-settings-item__left">
                <div className="og-settings-item__icon">💰</div>
                <div>
                  <p className="og-settings-item__title">OrganizaGrana</p>
                  <p className="og-settings-item__subtitle">Versão 1.0.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 'calc(var(--tab-bar-height) + var(--safe-area-bottom) + var(--space-4))' }} />
      </div>

      {/* Modal de formulário de categoria */}
      {catForm !== null && (
        <>
          <div className="og-sheet-overlay" onClick={() => { setCatForm(null); setEditCatId(null); }} />
          <div className="og-sheet">
            <div className="og-sheet__handle" />
            <h2 className="og-sheet__title">{editCatId ? 'Editar Categoria' : 'Nova Categoria'}</h2>

            <div className="og-input-group">
              <label className="og-label">Nome</label>
              <input className="og-input" placeholder="Nome da categoria" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>

            <div className="og-input-group">
              <label className="og-label">Ícone</label>
              <div className="settings-icon-grid">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    className={`settings-icon-btn ${catForm.icon === icon ? 'settings-icon-btn--active' : ''}`}
                    onClick={() => setCatForm({ ...catForm, icon })}
                  >{icon}</button>
                ))}
              </div>
            </div>

            <div className="og-input-group">
              <label className="og-label">Cor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCatForm({ ...catForm, color })}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: color,
                      border: catForm.color === color ? '3px solid var(--color-text)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <button className="og-btn og-btn--primary og-btn--full og-btn--lg" onClick={handleSaveCat}>
              {editCatId ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;

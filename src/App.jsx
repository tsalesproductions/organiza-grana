/**
 * OrganizaGrana — App Principal
 * Componente raiz: gerencia onboarding, tab bar e roteamento entre telas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from './store/AppContext.jsx';
import { isOnboardingDone } from './services/user.js';
import { requestNotificationPermission, scheduleAllNotifications } from './services/notifications.js';

// Páginas
import OnboardingPage from './pages/Onboarding/OnboardingPage.jsx';
import DashboardPage  from './pages/Dashboard/DashboardPage.jsx';
import TransactionsPage from './pages/Transactions/TransactionsPage.jsx';
import CardsPage      from './pages/Cards/CardsPage.jsx';
import ReportsPage    from './pages/Reports/ReportsPage.jsx';
import SettingsPage   from './pages/Settings/SettingsPage.jsx';

// Componente de Toast global
import Toast from './components/ui/Toast.jsx';

// CSS das páginas
import './pages/Onboarding/OnboardingPage.css';

// ---- Ícones SVG para a Tab Bar ----
const TabIcons = {
  dashboard: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'var(--color-primary-ultra)' : 'none'} />
    </svg>
  ),
  transactions: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12h.01M8 16h.01M12 12h4M12 16h4"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  cards: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2"
        fill={active ? 'var(--color-primary-ultra)' : 'none'} />
      <path d="M2 10h20"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2" />
    </svg>
  ),
  reports: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M18 20V10M12 20V4M6 20v-6"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  settings: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={active ? 'var(--color-primary)' : 'var(--color-text-muted)'}
        strokeWidth="2" />
    </svg>
  ),
};

// ---- Abas da navegação ----
const TABS = [
  { id: 'dashboard',    label: 'Início',      icon: TabIcons.dashboard },
  { id: 'transactions', label: 'Extrato',     icon: TabIcons.transactions },
  { id: 'cards',        label: 'Cartões',     icon: TabIcons.cards },
  { id: 'reports',      label: 'Relatórios',  icon: TabIcons.reports },
  { id: 'settings',     label: 'Config.',     icon: TabIcons.settings },
];

/**
 * Componente principal do App
 */
const App = ({ dbReady }) => {
  const { toast } = useApp();
  const [onboardingDone, setOnboardingDone] = useState(null); // null = carregando
  const [activeTab, setActiveTab]           = useState('dashboard');

  // Verifica se onboarding já foi concluído
  useEffect(() => {
    if (!dbReady) return;
    isOnboardingDone().then((done) => {
      setOnboardingDone(done);
      // Se onboarding feito, agenda notificações
      if (done) {
        requestNotificationPermission().then(() => scheduleAllNotifications());
      }
    });
  }, [dbReady]);

  // Callback quando onboarding é concluído
  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true);
    requestNotificationPermission().then(() => scheduleAllNotifications());
  }, []);

  // Tela de loading enquanto DB inicializa
  if (!dbReady || onboardingDone === null) {
    return (
      <div className="app-splash">
        <div className="app-splash__icon">💰</div>
        <h1 className="app-splash__name">OrganizaGrana</h1>
        <div className="app-splash__loader">
          <div className="app-splash__loader-bar" />
        </div>
      </div>
    );
  }

  // Onboarding
  if (!onboardingDone) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  // App principal com Tab Bar
  return (
    <div className="app-root">

      {/* Área de conteúdo das páginas */}
      <div className="app-content">
        {activeTab === 'dashboard'    && <DashboardPage />}
        {activeTab === 'transactions' && <TransactionsPage />}
        {activeTab === 'cards'        && <CardsPage />}
        {activeTab === 'reports'      && <ReportsPage />}
        {activeTab === 'settings'     && <SettingsPage />}
      </div>

      {/* Bottom Tab Bar */}
      <nav className="tab-bar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab-bar__item ${isActive ? 'tab-bar__item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
            >
              <div className="tab-bar__icon">
                {tab.icon(isActive)}
              </div>
              <span className="tab-bar__label">{tab.label}</span>
              {isActive && <div className="tab-bar__indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Toast de feedback global */}
      {toast && <Toast message={toast.message} type={toast.type} />}

    </div>
  );
};

export default App;

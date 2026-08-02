/**
 * OrganizaGrana — Entry Point
 * Inicializa o banco de dados SQLite e renderiza o app React.
 * Aguarda o evento `deviceready` do Cordova antes de iniciar.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './store/AppContext.jsx';
import { initDatabase } from './services/db.js';

// Estilos globais
import './styles/theme.css';
import './styles/components.css';
import './styles/app.css';

let appStarted = false;

/**
 * Inicializa o banco e renderiza o React app.
 * @param {boolean} dbReady - indica se o SQLite foi inicializado com sucesso
 */
const startApp = async (dbReady) => {
  if (appStarted) return;
  appStarted = true;

  const container = document.getElementById('app');
  if (!container) {
    console.error('[Main] Container #app não encontrado!');
    return;
  }

  const root = createRoot(container);
  root.render(
    <AppProvider>
      <App dbReady={dbReady} />
    </AppProvider>
  );
};

/**
 * Inicializa o banco de dados e inicia o app.
 */
const bootstrap = async () => {
  let dbReady = false;
  try {
    await initDatabase();
    dbReady = true;
    console.log('[Main] Banco de dados pronto!');
  } catch (err) {
    console.error('[Main] Falha ao inicializar banco:', err);
  }
  await startApp(dbReady);
};

// ---- Estratégia de inicialização ----
// No Cordova (Android): aguarda 'deviceready'
// No browser (desenvolvimento): inicia imediatamente
if (window.cordova) {
  document.addEventListener('deviceready', bootstrap, false);
} else {
  // Pequeno delay para simular o deviceready no browser
  bootstrap();
}

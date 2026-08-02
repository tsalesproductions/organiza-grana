/**
 * OrganizaGrana — Context Global de Estado
 * Gerencia o estado compartilhado entre todas as telas do app.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { getCurrentMonthYear } from '../utils/dates.js';

// ---- Criação do Context ----
const AppContext = createContext(null);

/**
 * Provider do contexto global.
 * Encapsula toda a árvore de componentes para fornecer estado compartilhado.
 */
export const AppProvider = ({ children }) => {
  // Mês/ano selecionado (usado no extrato e relatórios)
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentMonthYear());

  // Controla se o app está carregando dados do banco
  const [isLoading, setIsLoading] = useState(false);

  // Toast de feedback global
  const [toast, setToast] = useState(null);

  // Controle do formulário de transação (Bottom Sheet)
  const [transactionSheet, setTransactionSheet] = useState({
    open: false,
    type: 'expense',    // 'income' | 'expense'
    editData: null,     // preenchido quando editando
  });

  // Flag para forçar refetch de dados nas telas
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ---- Ações ----

  /** Exibe um toast de feedback */
  const showToast = useCallback((message, type = 'default', duration = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  /** Abre o formulário de nova transação */
  const openTransactionSheet = useCallback((type = 'expense', editData = null) => {
    setTransactionSheet({ open: true, type, editData });
  }, []);

  /** Fecha o formulário de transação */
  const closeTransactionSheet = useCallback(() => {
    setTransactionSheet({ open: false, type: 'expense', editData: null });
  }, []);

  /** Dispara um refetch de dados nas telas que escutam */
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const value = {
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    setIsLoading,
    toast,
    showToast,
    transactionSheet,
    openTransactionSheet,
    closeTransactionSheet,
    refreshTrigger,
    triggerRefresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Hook personalizado para acessar o contexto global.
 * Lança erro se usado fora do AppProvider.
 */
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
};

export default AppContext;

/**
 * OrganizaGrana — Página de Onboarding
 * Exibida apenas no primeiro acesso. Captura o e-mail do usuário.
 */
import React, { useState } from 'react';
import { saveUserEmail } from '../../services/user.js';

const OnboardingPage = ({ onComplete }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleStart = async () => {
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await saveUserEmail(email.trim().toLowerCase());
      onComplete();
    } catch (err) {
      console.error('[Onboarding] Erro ao salvar e-mail:', err);
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      {/* Background decorativo */}
      <div className="onboarding-bg" />
      <div className="onboarding-blob onboarding-blob--1" />
      <div className="onboarding-blob onboarding-blob--2" />

      <div className="onboarding-content animate-fade-in">

        {/* Logo e nome */}
        <div className="onboarding-logo">
          <div className="onboarding-logo__icon">💰</div>
          <h1 className="onboarding-logo__name">OrganizaGrana</h1>
        </div>

        {/* Headline */}
        <div className="onboarding-headline animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="onboarding-headline__title">
            Suas finanças,<br />
            <span className="onboarding-headline__accent">sob controle.</span>
          </h2>
          <p className="onboarding-headline__subtitle">
            Controle receitas, despesas e cartões de crédito de forma simples e 100% offline.
          </p>
        </div>

        {/* Features */}
        <div className="onboarding-features animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {[
            { icon: '📊', text: 'Relatórios e gráficos visuais' },
            { icon: '💳', text: 'Gestão de cartões e faturas' },
            { icon: '🔔', text: 'Lembretes de vencimento' },
          ].map(({ icon, text }) => (
            <div key={text} className="onboarding-feature">
              <span className="onboarding-feature__icon">{icon}</span>
              <span className="onboarding-feature__text">{text}</span>
            </div>
          ))}
        </div>

        {/* Formulário */}
        <div className="onboarding-form animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="onboarding-form__label">Qual é o seu e-mail?</p>
          <input
            className={`og-input onboarding-form__input ${error ? 'onboarding-form__input--error' : ''}`}
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            autoComplete="email"
            autoCapitalize="none"
          />
          {error && <p className="onboarding-form__error">{error}</p>}

          <button
            className={`og-btn og-btn--primary og-btn--full og-btn--lg onboarding-form__btn ${loading ? 'onboarding-form__btn--loading' : ''}`}
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? (
              <span className="onboarding-spinner" />
            ) : (
              <>Começar agora →</>
            )}
          </button>

          <p className="onboarding-form__privacy">
            🔒 Seus dados ficam apenas no seu dispositivo.
          </p>
        </div>

      </div>
    </div>
  );
};

export default OnboardingPage;

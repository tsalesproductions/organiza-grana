/**
 * OrganizaGrana — Página de Onboarding
 * Exibida apenas no primeiro acesso. Captura nome e e-mail do usuário.
 */
import React, { useState } from 'react';
import { saveUserProfile } from '../../services/user.js';

const STEPS = ['welcome', 'name', 'done'];

const OnboardingPage = ({ onComplete }) => {
  const [step, setStep]     = useState('welcome');
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleNext = () => {
    setError('');
    if (step === 'welcome') { setStep('name'); return; }
    if (step === 'name')    { handleStart(); return; }
  };

  const handleStart = async () => {
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await saveUserProfile(name.trim(), email.trim() || null);
      onComplete();
    } catch (err) {
      console.error('[Onboarding] Erro ao salvar perfil:', err);
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
          <img src="./img/logo.png" alt="OrganizaGrana" className="onboarding-logo__img" />
          <h1 className="onboarding-logo__name">OrganizaGrana</h1>
        </div>

        {/* Step: welcome */}
        {step === 'welcome' && (
          <>
            <div className="onboarding-headline animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="onboarding-headline__title">
                Suas finanças,<br />
                <span className="onboarding-headline__accent">sob controle.</span>
              </h2>
              <p className="onboarding-headline__subtitle">
                Controle receitas, despesas e cartões de crédito de forma simples e organizada.
              </p>
            </div>

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

            <div className="onboarding-form animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <button
                className="og-btn og-btn--primary og-btn--full og-btn--lg onboarding-form__btn"
                onClick={handleNext}
              >
                Começar agora →
              </button>
              <p className="onboarding-form__privacy">
                🔒 Seus dados ficam apenas no seu dispositivo.
              </p>
            </div>
          </>
        )}

        {/* Step: name */}
        {step === 'name' && (
          <div className="onboarding-form animate-slide-up">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--space-3)' }}>👋</div>
              <h2 className="onboarding-headline__title" style={{ marginBottom: 'var(--space-2)' }}>
                Olá! Como podemos<br />
                <span className="onboarding-headline__accent">te chamar?</span>
              </h2>
              <p className="onboarding-headline__subtitle">
                Personalize sua experiência com seu nome.
              </p>
            </div>

            <div className="og-input-group">
              <label className="og-label">Seu nome *</label>
              <input
                className={`og-input onboarding-form__input ${error ? 'onboarding-form__input--error' : ''}`}
                type="text"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                autoCapitalize="words"
                autoFocus
              />
            </div>

            <div className="og-input-group" style={{ marginTop: 'var(--space-3)' }}>
              <label className="og-label">E-mail (opcional)</label>
              <input
                className="og-input onboarding-form__input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>

            {error && <p className="onboarding-form__error">{error}</p>}

            <button
              className={`og-btn og-btn--primary og-btn--full og-btn--lg onboarding-form__btn ${loading ? 'onboarding-form__btn--loading' : ''}`}
              onClick={handleNext}
              disabled={loading}
              style={{ marginTop: 'var(--space-4)' }}
            >
              {loading ? (
                <span className="onboarding-spinner" />
              ) : (
                <>Entrar no app →</>
              )}
            </button>

            <p className="onboarding-form__privacy">
              🔒 Seus dados ficam apenas no seu dispositivo.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingPage;

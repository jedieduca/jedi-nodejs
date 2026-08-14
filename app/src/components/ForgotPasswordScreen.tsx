import React, { FormEvent, useMemo, useState } from 'react';
import authService, { RECOVER_PASSWORD_SUCCESS_MESSAGE } from '../services/authService';
import { NetworkFailureDetails, isNetworkFailureError } from '../utils/networkFailure';
import './ForgotPasswordScreen.css';

interface ForgotPasswordScreenProps {
  onGoToLogin?: () => void;
  onNetworkFailure?: (details: NetworkFailureDetails) => void;
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onGoToLogin, onNetworkFailure }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(() => {
    return isSubmitting || !email.trim();
  }, [email, isSubmitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setError('Informe um email válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.recuperarSenha({ email: trimmedEmail });
      setSuccessMessage(RECOVER_PASSWORD_SUCCESS_MESSAGE);
    } catch (err) {
      if (isNetworkFailureError(err)) {
        onNetworkFailure?.(err);
        return;
      }

      const message = err instanceof Error
        ? err.message
        : 'Não foi possível encaminhar a solicitação de recuperação de senha neste momento. Tente mais tarde!';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-password-screen-container">
      <div className="forgot-password-screen-overlay" />
      <div className="forgot-password-screen-card">
        <div className="forgot-password-screen-header">
          <button
            type="button"
            className="forgot-password-screen-back-button"
            onClick={onGoToLogin}
            aria-label="Voltar para login"
          >
            Voltar
          </button>
          <div className="forgot-password-screen-logo-wrapper">
            <img
              src={`${process.env.PUBLIC_URL}/assets/Logo_JEDi_fundo_escuro.png`}
              alt="JEDi Educa"
              className="forgot-password-screen-logo"
            />
          </div>
          <h1>Recuperar senha</h1>
          <p>Informe seu e-mail para solicitar uma nova senha.</p>
        </div>

        <form className="forgot-password-screen-form" onSubmit={handleSubmit}>
          <label htmlFor="forgot-password-email">Email</label>
          <input
            id="forgot-password-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            autoComplete="email"
          />

          {error && <div className="forgot-password-screen-error">{error}</div>}
          {successMessage && <div className="forgot-password-screen-success">{successMessage}</div>}

          <button type="submit" className="forgot-password-screen-submit" disabled={isDisabled}>
            {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
          </button>

          <div className="forgot-password-screen-footer">
            <span>Lembrou sua senha?</span>
            <button type="button" className="forgot-password-screen-link" onClick={onGoToLogin}>
              Faça Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;

import React, { FormEvent, useMemo, useState } from 'react';
import authService, { PASSWORD_MIN_LENGTH, RESET_PASSWORD_SUCCESS_MESSAGE } from '../services/authService';
import { NetworkFailureDetails, isNetworkFailureError } from '../utils/networkFailure';
import './ForgotPasswordScreen.css';

interface ResetPasswordScreenProps {
  token: string;
  onGoToLogin?: () => void;
  onRequestNewLink?: () => void;
  onNetworkFailure?: (details: NetworkFailureDetails) => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  token,
  onGoToLogin,
  onRequestNewLink,
  onNetworkFailure
}) => {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(() => {
    return isSubmitting || !senha || !confirmacao;
  }, [senha, confirmacao, isSubmitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (senha.length < PASSWORD_MIN_LENGTH) {
      setError(`A nova senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }

    if (senha !== confirmacao) {
      setError('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.redefinirSenha({ token, senha });
      setIsDone(true);
    } catch (err) {
      if (isNetworkFailureError(err)) {
        onNetworkFailure?.(err);
        return;
      }

      const message = err instanceof Error
        ? err.message
        : 'Não foi possível redefinir a senha neste momento. Tente novamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFeedback = () => setError(null);

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
          <h1>Criar nova senha</h1>
          <p>Escolha uma nova senha com no mínimo {PASSWORD_MIN_LENGTH} caracteres.</p>
        </div>

        {isDone ? (
          <div className="forgot-password-screen-form">
            <div className="forgot-password-screen-success">{RESET_PASSWORD_SUCCESS_MESSAGE}</div>
            <button type="button" className="forgot-password-screen-submit" onClick={onGoToLogin}>
              Ir para o login
            </button>
          </div>
        ) : (
          <form className="forgot-password-screen-form" onSubmit={handleSubmit}>
            <label htmlFor="reset-password-new">Nova senha</label>
            <input
              id="reset-password-new"
              type="password"
              value={senha}
              onChange={(event) => {
                setSenha(event.target.value);
                clearFeedback();
              }}
              autoComplete="new-password"
            />

            <label htmlFor="reset-password-confirm">Confirmar nova senha</label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmacao}
              onChange={(event) => {
                setConfirmacao(event.target.value);
                clearFeedback();
              }}
              autoComplete="new-password"
            />

            {error && <div className="forgot-password-screen-error">{error}</div>}

            <button type="submit" className="forgot-password-screen-submit" disabled={isDisabled}>
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>

            <div className="forgot-password-screen-footer">
              <span>Link expirado?</span>
              <button type="button" className="forgot-password-screen-link" onClick={onRequestNewLink}>
                Solicitar novo link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;

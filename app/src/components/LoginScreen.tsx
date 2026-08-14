import React, { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBackendEndpoint } from '../config/backend';
import { NetworkFailureDetails, isFetchFailure, isNetworkFailureError, toNetworkFailureError } from '../utils/networkFailure';
import './LoginScreen.css';

const CHANGE_PASSWORD_URL = getBackendEndpoint('trocarSenha');

interface LoginScreenProps {
  onGoToRegister?: () => void;
  onGoToForgotPassword?: () => void;
  onNetworkFailure?: (details: NetworkFailureDetails) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onGoToRegister, onGoToForgotPassword, onNetworkFailure }) => {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [isTrocarSenha, setIsTrocarSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [repetirSenha, setRepetirSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(() => {
    if (isSubmitting || !loginValue.trim() || !password.trim()) {
      return true;
    }

    if (!isTrocarSenha) {
      return false;
    }

    return !novaSenha.trim() || !repetirSenha.trim();
  }, [isSubmitting, isTrocarSenha, loginValue, novaSenha, password, repetirSenha]);

  const handleTrocarSenhaChange = (checked: boolean) => {
    setIsTrocarSenha(checked);
    setError(null);
    setSuccessMessage(null);

    if (!checked) {
      setNovaSenha('');
      setRepetirSenha('');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!loginValue.trim() || !password.trim()) {
      setError('Preencha usuário/email e senha para continuar.');
      return;
    }

    if (isTrocarSenha) {
      if (!novaSenha.trim() || !repetirSenha.trim()) {
        setError('Preencha a nova senha e a confirmação para continuar.');
        return;
      }

      if (novaSenha !== repetirSenha) {
        setError('A nova senha e a repetição da senha devem ser iguais.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isTrocarSenha) {
        let response: Response;
        try {
          response = await fetch(CHANGE_PASSWORD_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              login: loginValue.trim(),
              senhaAntiga: password,
              senhaNova: novaSenha
            })
          });
        } catch (error) {
          if (isFetchFailure(error)) {
            throw toNetworkFailureError(error, 'TROCA DE SENHA', CHANGE_PASSWORD_URL, 'auth');
          }
          throw error;
        }

        let rawText = '';
        try {
          rawText = (await response.text()).trim();
        } catch (error) {
          throw toNetworkFailureError(error, 'TROCA DE SENHA', CHANGE_PASSWORD_URL, 'auth');
        }

        if (!response.ok) {
          if (response.status >= 500) {
            throw toNetworkFailureError(new Error(`HTTP ${response.status}`), 'TROCA DE SENHA', CHANGE_PASSWORD_URL, 'auth');
          }
          throw new Error(rawText || `Falha ao trocar senha: HTTP ${response.status}`);
        }

        if (rawText !== '1') {
          throw new Error(rawText || 'Não foi possível trocar a senha. Tente novamente.');
        }

        setSuccessMessage('Senha alterada com sucesso. Faça login com a nova senha.');
        setPassword('');
        setNovaSenha('');
        setRepetirSenha('');
        setShowPassword(false);
        setIsTrocarSenha(false);
      } else {
        await login(loginValue.trim(), password);
      }
    } catch (err) {
      if (isNetworkFailureError(err)) {
        onNetworkFailure?.(err);
        return;
      }

      const message = err instanceof Error
        ? err.message
        : isTrocarSenha
          ? 'Falha ao trocar senha. Tente novamente.'
          : 'Falha ao autenticar. Tente novamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen-container">
      <div className="login-screen-overlay" />
      <div className="login-screen-card">
        <div className="login-screen-header">
          <div className="login-screen-logo-wrapper">
            <img
              src={`${process.env.PUBLIC_URL}/assets/Logo_JEDi_fundo_escuro.png`}
              alt="JEDi Educa"
              className="login-screen-logo"
            />
          </div>
          <h1>Bem-vindo ao JEDi Educa!</h1>
          <p>Pronto para começar sua jornada?</p>
        </div>

        <form className="login-screen-form" onSubmit={handleSubmit}>
          <label htmlFor="login-input">Usuário ou Email</label>
          <input
            id="login-input"
            type="text"
            placeholder="Digite seu usuário ou email"
            value={loginValue}
            onChange={(event) => {
              setLoginValue(event.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            autoComplete="username"
          />

          <label htmlFor="password-input">{isTrocarSenha ? 'Senha antiga' : 'Senha'}</label>
          <div className="login-screen-password-row">
            <div className="login-screen-password-wrapper">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder={isTrocarSenha ? 'Digite sua senha atual' : 'Digite sua senha'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-screen-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <label className="login-screen-trocar-label" htmlFor="trocar-senha-checkbox">
              <input
                id="trocar-senha-checkbox"
                type="checkbox"
                checked={isTrocarSenha}
                onChange={(event) => handleTrocarSenhaChange(event.target.checked)}
              />
              Trocar
            </label>
          </div>

          {isTrocarSenha ? (
            <>
              <label htmlFor="nova-senha-input">Nova senha</label>
              <input
                id="nova-senha-input"
                type="password"
                placeholder="Digite a nova senha"
                value={novaSenha}
                onChange={(event) => {
                  setNovaSenha(event.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                autoComplete="new-password"
              />

              <label htmlFor="repetir-senha-input">Repetir senha</label>
              <input
                id="repetir-senha-input"
                type="password"
                placeholder="Repita a nova senha"
                value={repetirSenha}
                onChange={(event) => {
                  setRepetirSenha(event.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                autoComplete="new-password"
              />
            </>
          ) : null}

          {error && <div className="login-screen-error">{error}</div>}
          {successMessage && <div className="login-screen-success">{successMessage}</div>}

          <button type="submit" className="login-screen-submit" disabled={isDisabled}>
            {isSubmitting ? (isTrocarSenha ? 'Alterando...' : 'Entrando...') : 'Entrar'}
          </button>

          <div className="login-screen-footer">
            <span>Esqueceu a senha?</span>
            <button type="button" className="login-screen-link" onClick={onGoToForgotPassword}>
              Esqueci a senha
            </button>
          </div>

          <div className="register-screen-footer">
            <span>Usuário novo?</span>
            <button type="button" className="register-screen-link" onClick={onGoToRegister}>
              Cadastre-se
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;

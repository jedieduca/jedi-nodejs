import React, { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import { NetworkFailureDetails, isNetworkFailureError } from '../utils/networkFailure';
import './RegisterScreen.css';

interface RegisterScreenProps {
  onGoToLogin?: () => void;
  onNetworkFailure?: (details: NetworkFailureDetails) => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onGoToLogin, onNetworkFailure }) => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(() => {
    return (
      isSubmitting ||
      !name.trim() ||
      !email.trim() ||
      !loginValue.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    );
  }, [isSubmitting, name, email, loginValue, password, confirmPassword]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('Informe um email válido.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.cadastrar({
        nome: name.trim(),
        login: loginValue.trim(),
        email: email.trim(),
        senha: password
      });

      await login(loginValue.trim(), password);
    } catch (err) {
      if (isNetworkFailureError(err)) {
        onNetworkFailure?.(err);
        return;
      }

      const message = err instanceof Error ? err.message : 'Falha ao cadastrar. Tente novamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-screen-container">
      <div className="register-screen-overlay" />
      <div className="register-screen-card">
        <div className="register-screen-header">
          <button
            type="button"
            className="register-screen-back-button"
            onClick={onGoToLogin}
            aria-label="Voltar para login"
          >
            Voltar
          </button>
          <div className="register-screen-logo-wrapper">
            <img
              src={`${process.env.PUBLIC_URL}/assets/Logo_JEDi_fundo_escuro.png`}
              alt="JEDi Educa"
              className="register-screen-logo"
            />
          </div>
          <h1>Crie sua conta</h1>
          <p>Junte-se a aventura do conhecimento!</p>
        </div>

        <form className="register-screen-form" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Nome Completo</label>
          <input
            id="register-name"
            type="text"
            placeholder="Como quer ser chamado?"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            autoComplete="name"
          />

          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            autoComplete="email"
          />

          <label htmlFor="register-login">Login</label>
          <input
            id="register-login"
            type="text"
            placeholder="Digite seu login"
            value={loginValue}
            onChange={(event) => {
              setLoginValue(event.target.value);
              setError(null);
            }}
            autoComplete="username"
          />

          <label htmlFor="register-password">Senha</label>
          <input
            id="register-password"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            autoComplete="new-password"
          />

          <label htmlFor="register-password-confirm">Confirmar Senha</label>
          <input
            id="register-password-confirm"
            type="password"
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError(null);
            }}
            autoComplete="new-password"
          />

          {error && <div className="register-screen-error">{error}</div>}

          <button type="submit" className="register-screen-submit" disabled={isDisabled}>
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>

          <div className="register-screen-footer">
            <span>Já tem uma conta?</span>
            <button type="button" className="register-screen-link" onClick={onGoToLogin}>
              Faça Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterScreen;

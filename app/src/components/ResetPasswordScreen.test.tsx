import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordScreen from './ResetPasswordScreen';
import authService from '../services/authService';
import { NetworkFailureError } from '../utils/networkFailure';

jest.mock('../services/authService', () => ({
  __esModule: true,
  PASSWORD_MIN_LENGTH: 8,
  RESET_PASSWORD_SUCCESS_MESSAGE: 'Senha alterada com sucesso! Faça login com a nova senha.',
  default: {
    redefinirSenha: jest.fn()
  }
}));

const redefinirSenhaMock = authService.redefinirSenha as jest.MockedFunction<typeof authService.redefinirSenha>;

const RESET_TOKEN = 'b'.repeat(64);

const fillPasswords = (senha: string, confirmacao: string) => {
  userEvent.type(screen.getByLabelText(/^Nova senha$/i), senha);
  userEvent.type(screen.getByLabelText(/^Confirmar nova senha$/i), confirmacao);
  userEvent.click(screen.getByRole('button', { name: /Salvar nova senha/i }));
};

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    redefinirSenhaMock.mockReset();
  });

  it('rejects a password shorter than the minimum length', () => {
    render(<ResetPasswordScreen token={RESET_TOKEN} />);

    fillPasswords('1234567', '1234567');

    expect(screen.getByText(/A nova senha deve ter no mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(redefinirSenhaMock).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match', () => {
    render(<ResetPasswordScreen token={RESET_TOKEN} />);

    fillPasswords('novaSenha123', 'outraSenha123');

    expect(screen.getByText(/As senhas não conferem/i)).toBeInTheDocument();
    expect(redefinirSenhaMock).not.toHaveBeenCalled();
  });

  it('sends the token with the new password and shows the success message', async () => {
    const onGoToLogin = jest.fn();
    redefinirSenhaMock.mockResolvedValue();

    render(<ResetPasswordScreen token={RESET_TOKEN} onGoToLogin={onGoToLogin} />);

    fillPasswords('novaSenha123', 'novaSenha123');

    expect(redefinirSenhaMock).toHaveBeenCalledWith({ token: RESET_TOKEN, senha: 'novaSenha123' });
    expect(await screen.findByText(/Senha alterada com sucesso/i)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /Ir para o login/i }));
    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });

  it('shows the error returned by the API inline', async () => {
    redefinirSenhaMock.mockRejectedValue(
      new Error('Este link de redefinição de senha é inválido ou expirou. Solicite um novo.')
    );

    render(<ResetPasswordScreen token={RESET_TOKEN} />);

    fillPasswords('novaSenha123', 'novaSenha123');

    expect(await screen.findByText(/inválido ou expirou/i)).toBeInTheDocument();
  });

  it('forwards network failures to the global handler', async () => {
    const onNetworkFailure = jest.fn();
    const networkFailure = new NetworkFailureError({
      resourceLabel: 'REDEFINIÇÃO DE SENHA',
      source: 'https://api2.jedieduca.com.br/api/system_user/redefinirSenha',
      context: 'auth'
    });
    redefinirSenhaMock.mockRejectedValue(networkFailure);

    render(<ResetPasswordScreen token={RESET_TOKEN} onNetworkFailure={onNetworkFailure} />);

    fillPasswords('novaSenha123', 'novaSenha123');

    await waitFor(() => expect(onNetworkFailure).toHaveBeenCalledWith(networkFailure));
  });

  it('lets the user request a new link', () => {
    const onRequestNewLink = jest.fn();

    render(<ResetPasswordScreen token={RESET_TOKEN} onRequestNewLink={onRequestNewLink} />);

    userEvent.click(screen.getByRole('button', { name: /Solicitar novo link/i }));

    expect(onRequestNewLink).toHaveBeenCalledTimes(1);
  });
});

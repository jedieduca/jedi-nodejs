import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import authService from '../services/authService';
import { NetworkFailureError } from '../utils/networkFailure';

jest.mock('../services/authService', () => ({
  __esModule: true,
  RECOVER_PASSWORD_SUCCESS_MESSAGE:
    'Solicitação de recuperação de senha encaminhada com sucesso. Se o e-mail estiver cadastrado, você receberá a nova senha nesse e-mail.',
  default: {
    recuperarSenha: jest.fn()
  }
}));

const recuperarSenhaMock = authService.recuperarSenha as jest.MockedFunction<typeof authService.recuperarSenha>;

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    recuperarSenhaMock.mockReset();
  });

  it('shows an inline validation error for invalid email', () => {
    render(<ForgotPasswordScreen />);

    userEvent.type(screen.getByLabelText(/^Email$/i), 'email-invalido');
    userEvent.click(screen.getByRole('button', { name: /Enviar solicitação/i }));

    expect(screen.getByText(/Informe um email válido/i)).toBeInTheDocument();
    expect(recuperarSenhaMock).not.toHaveBeenCalled();
  });

  it('shows submitting state and success message after sending the request', async () => {
    let resolveRequest: () => void = () => {};
    recuperarSenhaMock.mockReturnValue(new Promise<void>((resolve) => {
      resolveRequest = resolve;
    }));

    render(<ForgotPasswordScreen />);

    userEvent.type(screen.getByLabelText(/^Email$/i), 'user01@teste.com');
    userEvent.click(screen.getByRole('button', { name: /Enviar solicitação/i }));

    expect(screen.getByRole('button', { name: /Enviando/i })).toBeDisabled();
    expect(recuperarSenhaMock).toHaveBeenCalledWith({ email: 'user01@teste.com' });

    resolveRequest();

    expect(await screen.findByText(/Solicitação de recuperação de senha encaminhada com sucesso/i)).toBeInTheDocument();
  });

  it('shows business recovery errors inline', async () => {
    recuperarSenhaMock.mockRejectedValue(
      new Error('Não foi possível encaminhar a solicitação de recuperação de senha neste momento. Tente mais tarde!')
    );

    render(<ForgotPasswordScreen />);

    userEvent.type(screen.getByLabelText(/^Email$/i), 'user01@teste.com');
    userEvent.click(screen.getByRole('button', { name: /Enviar solicitação/i }));

    expect(await screen.findByText(/Não foi possível encaminhar a solicitação/i)).toBeInTheDocument();
  });

  it('forwards network failures to the global handler', async () => {
    const onNetworkFailure = jest.fn();
    const networkFailure = new NetworkFailureError({
      resourceLabel: 'RECUPERAÇÃO DE SENHA',
      source: 'https://api2.jedieduca.com.br/api/system_user/recuperarSenha',
      context: 'auth'
    });
    recuperarSenhaMock.mockRejectedValue(networkFailure);

    render(<ForgotPasswordScreen onNetworkFailure={onNetworkFailure} />);

    userEvent.type(screen.getByLabelText(/^Email$/i), 'user01@teste.com');
    userEvent.click(screen.getByRole('button', { name: /Enviar solicitação/i }));

    await waitFor(() => expect(onNetworkFailure).toHaveBeenCalledWith(networkFailure));
  });

  it('returns to login when clicking back', () => {
    const onGoToLogin = jest.fn();

    render(<ForgotPasswordScreen onGoToLogin={onGoToLogin} />);

    userEvent.click(screen.getByRole('button', { name: /Voltar/i }));

    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });
});

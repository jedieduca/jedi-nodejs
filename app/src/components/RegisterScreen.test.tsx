import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterScreen from './RegisterScreen';
import authService from '../services/authService';
import { NetworkFailureError } from '../utils/networkFailure';

const mockLogin = jest.fn();

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    cadastrar: jest.fn()
  }
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin
  })
}));

const cadastrarMock = authService.cadastrar as jest.MockedFunction<typeof authService.cadastrar>;

const fillValidForm = () => {
  userEvent.type(screen.getByLabelText(/Nome Completo/i), 'Usuário Cadastro 1');
  userEvent.type(screen.getByLabelText(/^Email$/i), 'user01@teste.com');
  userEvent.type(screen.getByLabelText(/^Login$/i), 'user01');
  userEvent.type(screen.getByLabelText(/^Senha$/i), '1234');
  userEvent.type(screen.getByLabelText(/Confirmar Senha/i), '1234');
};

describe('RegisterScreen', () => {
  beforeEach(() => {
    cadastrarMock.mockReset();
    mockLogin.mockReset();
  });

  it('does not render the birth date field', () => {
    render(<RegisterScreen />);

    expect(screen.queryByLabelText(/Data de Nascimento/i)).not.toBeInTheDocument();
  });

  it('shows an inline validation error for invalid email', () => {
    render(<RegisterScreen />);

    userEvent.type(screen.getByLabelText(/Nome Completo/i), 'Usuário Cadastro 1');
    userEvent.type(screen.getByLabelText(/^Email$/i), 'email-invalido');
    userEvent.type(screen.getByLabelText(/^Login$/i), 'user01');
    userEvent.type(screen.getByLabelText(/^Senha$/i), '1234');
    userEvent.type(screen.getByLabelText(/Confirmar Senha/i), '1234');
    userEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    expect(screen.getByText(/Informe um email válido/i)).toBeInTheDocument();
    expect(cadastrarMock).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows an inline validation error when passwords do not match', () => {
    render(<RegisterScreen />);

    userEvent.type(screen.getByLabelText(/Nome Completo/i), 'Usuário Cadastro 1');
    userEvent.type(screen.getByLabelText(/^Email$/i), 'user01@teste.com');
    userEvent.type(screen.getByLabelText(/^Login$/i), 'user01');
    userEvent.type(screen.getByLabelText(/^Senha$/i), '1234');
    userEvent.type(screen.getByLabelText(/Confirmar Senha/i), '4321');
    userEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    expect(screen.getByText(/As senhas não conferem/i)).toBeInTheDocument();
    expect(cadastrarMock).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('registers the user and logs in automatically', async () => {
    cadastrarMock.mockResolvedValue(undefined);
    mockLogin.mockResolvedValue(undefined);

    render(<RegisterScreen />);

    fillValidForm();
    userEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    await waitFor(() => expect(cadastrarMock).toHaveBeenCalledWith({
      nome: 'Usuário Cadastro 1',
      login: 'user01',
      email: 'user01@teste.com',
      senha: '1234'
    }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user01', '1234'));
  });

  it('shows business registration errors inline', async () => {
    cadastrarMock.mockRejectedValue(new Error('Usuário já cadastrado'));

    render(<RegisterScreen />);

    fillValidForm();
    userEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    expect(await screen.findByText(/Usuário já cadastrado/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('forwards network failures to the global handler', async () => {
    const onNetworkFailure = jest.fn();
    const networkFailure = new NetworkFailureError({
      resourceLabel: 'CADASTRO',
      source: 'https://api2.jedieduca.com.br/api/system_user/cadastrar',
      context: 'auth'
    });
    cadastrarMock.mockRejectedValue(networkFailure);

    render(<RegisterScreen onNetworkFailure={onNetworkFailure} />);

    fillValidForm();
    userEvent.click(screen.getByRole('button', { name: /Cadastrar/i }));

    await waitFor(() => expect(onNetworkFailure).toHaveBeenCalledWith(networkFailure));
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

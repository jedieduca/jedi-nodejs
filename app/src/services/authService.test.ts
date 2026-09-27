import { NetworkFailureError } from '../utils/networkFailure';
import {
  RECOVER_PASSWORD_ERROR_MESSAGE,
  REGISTER_EMAIL_IN_USE_MESSAGE,
  REGISTER_GENERIC_ERROR_MESSAGE,
  REGISTER_LOGIN_IN_USE_MESSAGE,
  cadastrar,
  recuperarSenha
} from './authService';

const REGISTER_URL = 'https://api2.jedieduca.com.br/api/system_user/cadastrar';
const RECOVER_PASSWORD_URL = 'https://api2.jedieduca.com.br/api/system_user/recuperarSenha';

const mockJsonResponse = (body: unknown, ok = true, status = 200): Response => ({
  ok,
  status,
  text: jest.fn().mockResolvedValue(JSON.stringify(body))
} as unknown as Response);

const mockTextResponse = (body: string, ok = true, status = 200): Response => ({
  ok,
  status,
  text: jest.fn().mockResolvedValue(body)
} as unknown as Response);

describe('authService.cadastrar', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts the expected registration payload to the Jedieduca endpoint', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ resposta: 1 }));

    await expect(cadastrar({
      nome: 'Usuário Cadastro 1',
      senha: '1234',
      login: 'user01',
      email: 'user01@teste.com'
    })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(REGISTER_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: 'Usuário Cadastro 1',
        senha: '1234',
        login: 'user01',
        email: 'user01@teste.com'
      })
    });
  });

  it('throws the e-mail in use error when the API returns resposta 0', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ resposta: 0 }));

    await expect(cadastrar({
      nome: 'Usuário Cadastro 1',
      senha: '1234',
      login: 'user01',
      email: 'user01@teste.com'
    })).rejects.toThrow(REGISTER_EMAIL_IN_USE_MESSAGE);
  });

  it('throws the login in use error when the API returns resposta 2', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ resposta: 2 }));

    await expect(cadastrar({
      nome: 'Usuário Cadastro 1',
      senha: '1234',
      login: 'user01',
      email: 'user01@teste.com'
    })).rejects.toThrow(REGISTER_LOGIN_IN_USE_MESSAGE);
  });

  it('throws the generic error when the API returns an unknown resposta', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ resposta: 99 }));

    await expect(cadastrar({
      nome: 'Usuário Cadastro 1',
      senha: '1234',
      login: 'user01',
      email: 'user01@teste.com'
    })).rejects.toThrow(REGISTER_GENERIC_ERROR_MESSAGE);
  });

  it('throws NetworkFailureError when fetch fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(cadastrar({
      nome: 'Usuário Cadastro 1',
      senha: '1234',
      login: 'user01',
      email: 'user01@teste.com'
    })).rejects.toMatchObject({
      resourceLabel: 'CADASTRO',
      source: REGISTER_URL,
      context: 'auth'
    });

    await expect(cadastrar({
      nome: 'Usuário Cadastro 1',
      senha: '1234',
      login: 'user01',
      email: 'user01@teste.com'
    })).rejects.toBeInstanceOf(NetworkFailureError);
  });
});

describe('authService.recuperarSenha', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts the expected recovery payload to the Jedieduca endpoint', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ resposta: 1 }));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(RECOVER_PASSWORD_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user01@teste.com'
      })
    });
  });

  it('throws a business error when the API returns resposta 0', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ resposta: 0 }));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).rejects.toThrow(RECOVER_PASSWORD_ERROR_MESSAGE);
  });

  it('reports an unexpected server payload as a regular error', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ status: 'ok' }));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).rejects.toThrow('Formato de resposta inesperado na recuperação de senha.');
  });

  it('reports the error returned by the server instead of a connection failure', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([
      {
        method: 'POST',
        rota: 'SYSTEM_USER',
        recurso: 'recuperarSenha',
        erro: 'Recurso inexistente! Recurso: recuperarSenha'
      }
    ], false, 404));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).rejects.toEqual(new Error('Recurso inexistente! Recurso: recuperarSenha'));
  });

  it('extracts the error attribute from a JSON response with BOM', async () => {
    fetchMock.mockResolvedValue(mockTextResponse(
      `\uFEFF${JSON.stringify({
        metodo: 'POST',
        rota: 'SYSTEM_USER',
        recurso: 'recuperarSenha',
        erro: 'Recurso inexistente! Recurso: recuperarSenha'
      })}`,
      false,
      404
    ));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).rejects.toEqual(new Error('Recurso inexistente! Recurso: recuperarSenha'));
  });

  it('extracts the error attribute even when the server returns malformed JSON', async () => {
    fetchMock.mockResolvedValue(mockTextResponse(
      '{"metodo":"POST","recurso":"recuperarSenha","erro":"Recurso inexistente! Recurso: recuperarSenha",}',
      false,
      404
    ));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).rejects.toEqual(new Error('Recurso inexistente! Recurso: recuperarSenha'));
  });

  it('throws NetworkFailureError when fetch fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(recuperarSenha({
      email: 'user01@teste.com'
    })).rejects.toMatchObject({
      resourceLabel: 'RECUPERAÇÃO DE SENHA',
      source: RECOVER_PASSWORD_URL,
      context: 'auth'
    });
  });
});

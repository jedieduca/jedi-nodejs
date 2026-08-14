import { AuthError, AuthUser } from '../types/auth';
import { getBackendEndpoint } from '../config/backend';
import { isFetchFailure, toNetworkFailureError } from '../utils/networkFailure';

const AUTH_URL = getBackendEndpoint('autenticar');
const REGISTER_URL = getBackendEndpoint('cadastrarUsuario');
const RECOVER_PASSWORD_URL = getBackendEndpoint('recuperarSenha');

export const RECOVER_PASSWORD_SUCCESS_MESSAGE =
  'Solicitação de recuperação de senha encaminhada com sucesso. Se o e-mail estiver cadastrado, você receberá a nova senha nesse e-mail.';

export const RECOVER_PASSWORD_ERROR_MESSAGE =
  'Não foi possível encaminhar a solicitação de recuperação de senha neste momento. Tente mais tarde!';

const isAuthError = (data: any): data is AuthError => {
  return data && typeof data === 'object' && typeof data.erro === 'string';
};

const parseJsonText = (text: string): unknown => {
  const normalizedText = text.replace(/^\uFEFF/, '').trim();
  let parsed: unknown = normalizedText;

  for (let attempt = 0; attempt < 2 && typeof parsed === 'string'; attempt += 1) {
    try {
      const nextParsed = JSON.parse(parsed);
      if (nextParsed === parsed) {
        break;
      }
      parsed = nextParsed;
    } catch {
      break;
    }
  }

  return parsed;
};

const getServerErrorMessage = (data: unknown): string | null => {
  if (typeof data === 'string') {
    const trimmedData = data.trim();
    if (!trimmedData) {
      return null;
    }

    const parsedData = parseJsonText(trimmedData);
    if (parsedData !== trimmedData) {
      return getServerErrorMessage(parsedData);
    }

    const errorAttribute = trimmedData.match(/["']erro["']\s*:\s*["']((?:\\.|[^"'\\])*)["']/i);
    if (errorAttribute) {
      try {
        return JSON.parse(`"${errorAttribute[1]}"`);
      } catch {
        return errorAttribute[1];
      }
    }

    return trimmedData;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const message = getServerErrorMessage(item);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (isAuthError(data)) {
    return data.erro.trim() || null;
  }

  return null;
};

const readResponsePayload = async (response: Response): Promise<unknown> => {
  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    throw new Error(`Não foi possível ler a resposta do servidor (HTTP ${response.status}).`);
  }

  if (!rawText.trim()) {
    return null;
  }

  return parseJsonText(rawText);
};

const throwServerResponseError = (response: Response, data: unknown): void => {
  const serverMessage = getServerErrorMessage(data);
  if (serverMessage) {
    throw new Error(serverMessage);
  }

  if (!response.ok) {
    throw new Error(`O servidor não conseguiu processar a solicitação (HTTP ${response.status}).`);
  }
};

const isAuthUser = (data: any): data is AuthUser => {
  return Boolean(
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.login === 'string' &&
    typeof data.email === 'string'
  );
};

export const autenticar = async (login: string, password: string): Promise<AuthUser> => {
  let response: Response;
  try {
    response = await fetch(AUTH_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ login, password })
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      throw toNetworkFailureError(error, 'AUTENTICAÇÃO', AUTH_URL, 'auth');
    }
    throw error;
  }

  const data = await readResponsePayload(response);
  throwServerResponseError(response, data);

  if (!isAuthUser(data)) {
    throw new Error('Formato de resposta inesperado no login.');
  }

  return data;
};

export interface RegisterPayload {
  nome: string;
  login: string;
  email: string;
  senha: string;
}

interface StatusResponse {
  resposta: number;
}

const isStatusResponse = (data: any): data is StatusResponse => {
  return Boolean(
    data &&
    typeof data === 'object' &&
    typeof data.resposta === 'number'
  );
};

export const cadastrar = async (payload: RegisterPayload): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(REGISTER_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: payload.nome,
        senha: payload.senha,
        login: payload.login,
        email: payload.email
      })
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      throw toNetworkFailureError(error, 'CADASTRO', REGISTER_URL, 'auth');
    }
    throw error;
  }

  const data = await readResponsePayload(response);
  throwServerResponseError(response, data);

  if (!isStatusResponse(data)) {
    throw new Error('Formato de resposta inesperado no cadastro.');
  }

  if (data.resposta !== 1) {
    throw new Error('Não foi possível cadastrar o usuário. Tente novamente.');
  }
};

export interface RecoverPasswordPayload {
  email: string;
}

export const recuperarSenha = async (payload: RecoverPasswordPayload): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(RECOVER_PASSWORD_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: payload.email
      })
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      throw toNetworkFailureError(error, 'RECUPERAÇÃO DE SENHA', RECOVER_PASSWORD_URL, 'auth');
    }
    throw error;
  }

  const data = await readResponsePayload(response);
  throwServerResponseError(response, data);

  if (!isStatusResponse(data)) {
    throw new Error('Formato de resposta inesperado na recuperação de senha.');
  }

  if (data.resposta !== 1) {
    throw new Error(RECOVER_PASSWORD_ERROR_MESSAGE);
  }
};

const authService = {
  autenticar,
  cadastrar,
  recuperarSenha
};

export default authService;

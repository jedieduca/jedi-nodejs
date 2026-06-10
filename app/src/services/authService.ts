import { AuthError, AuthUser } from '../types/auth';

const AUTH_URL = 'https://memore-net.com/api/JEDI-API/system_user/autenticar';
const REGISTER_URL = 'https://memore-net.com/api/JEDI-API/system_user/cadastrar';

const isAuthError = (data: any): data is AuthError => {
  return data && typeof data === 'object' && typeof data.erro === 'string';
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
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ login, password })
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new Error('Resposta inválida da API de autenticação');
  }

  if (isAuthError(data)) {
    throw new Error(data.erro);
  }

  if (!isAuthUser(data)) {
    throw new Error('Formato de resposta inesperado no login');
  }

  return data;
};

export interface RegisterPayload {
  name: string;
  nascimento: string;
  login: string;
  email: string;
  password: string;
}

export const cadastrar = async (payload: RegisterPayload): Promise<AuthUser> => {
  const response = await fetch(REGISTER_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: null,
      name: payload.name,
      nascimento: payload.nascimento,
      login: payload.login,
      email: payload.email,
      password: payload.password,
      active: 'Y'
    })
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new Error('Resposta inválida da API de cadastro');
  }

  if (isAuthError(data)) {
    throw new Error(data.erro);
  }

  if (!isAuthUser(data)) {
    throw new Error('Formato de resposta inesperado no cadastro');
  }

  return {
    ...data,
    frontpage_id: typeof data.frontpage_id === 'string' ? data.frontpage_id : ''
  };
};

const authService = {
  autenticar,
  cadastrar
};

export default authService;

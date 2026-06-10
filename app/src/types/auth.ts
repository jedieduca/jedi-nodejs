export interface AuthUser {
  id: string;
  name: string;
  login: string;
  email: string;
  frontpage_id: string;
  active: string;
}

export interface AuthError {
  erro: string;
}

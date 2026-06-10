import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';
import { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (loginValue: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {}
});

const USER_KEY = 'user';
const USER_EMAIL_KEY = 'userEmail';

export const useAuth = (): AuthContextValue => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const storedUser = window.localStorage.getItem(USER_KEY);
    if (!storedUser) {
      setIsLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;
      if (parsedUser && typeof parsedUser.id === 'string' && typeof parsedUser.email === 'string') {
        setUser(parsedUser);
      }
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem(USER_EMAIL_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const authenticatedUser = await authService.autenticar(loginValue, password);
    setUser(authenticatedUser);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser));
      window.localStorage.setItem(USER_EMAIL_KEY, authenticatedUser.email ?? '');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem(USER_EMAIL_KEY);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    login,
    logout
  }), [user, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

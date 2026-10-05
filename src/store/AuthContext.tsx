import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';
import { KEYS, readJSON, removeKey, writeJSON } from '../lib/storage';

interface AuthState {
  user: AuthUser | null;
  login: (name: string, email: string) => void;
  register: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readJSON<AuthUser | null>(KEYS.user, null));

  const login = useCallback((name: string, email: string) => {
    const value = { name: name.trim() || 'Sushanth Reddy', email: email.trim() };
    setUser(value);
    writeJSON(KEYS.user, value);
  }, []);

  const register = useCallback((name: string, email: string) => {
    const value = { name: name.trim(), email: email.trim() };
    setUser(value);
    writeJSON(KEYS.user, value);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    removeKey(KEYS.user);
  }, []);

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

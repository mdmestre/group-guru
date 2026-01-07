import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthToken, setAuthUser, getAuthUser } from './api';

type User = { email: string; clientId?: string; name?: string } | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
  const [user, setUser] = useState<User>(() => getAuthUser());

  useEffect(() => {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  }, [token]);

  const login = (t: string, u: User) => {
    setToken(t);
    setUser(u);
    setAuthToken(t);
    setAuthUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    setAuthUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

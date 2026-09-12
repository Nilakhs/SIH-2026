import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  department_id: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  department_id?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('sovereign_token');
    const savedUser = localStorage.getItem('sovereign_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('sovereign_token');
        localStorage.removeItem('sovereign_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('sovereign_token', data.access_token);
    localStorage.setItem('sovereign_user', JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (regData: RegisterData) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('sovereign_token', data.access_token);
    localStorage.setItem('sovereign_user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sovereign_token');
    localStorage.removeItem('sovereign_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

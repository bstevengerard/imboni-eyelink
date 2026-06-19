import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

export type User = {
  id: string | number;
  email: string;
  name: string;
  role: string;
  pt_id?: string;
  dr_id?: string;
  specialty?: string;
  hospital_id?: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => api.getUser());
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = useCallback(async () => {
    const token = api.getToken();
    console.log('AuthContext: refreshUser called, token:', token ? 'exists' : 'null');
    if (!token) {
      console.log('AuthContext: No token, clearing user');
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      console.log('AuthContext: Calling /api/auth/me...');
      const res = await api.get<{ user: User }>('/api/auth/me');
      console.log('AuthContext: /api/auth/me response:', res);
      
      // Check response - user is at root level, not in data
      const userRes = res as { success: boolean; user?: User };
      
      if (userRes.success && userRes.user) {
        const u = userRes.user;
        console.log('AuthContext: User refreshed:', u);
        setUser(u);
        api.setUser(u);
      } else {
        console.log('AuthContext: refreshUser failed, clearing token/user');
        api.clearToken();
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      console.error('AuthContext: refreshUser error:', e);
      api.clearToken();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) refreshUser();
    else {
      setUser(api.getUser());
      setLoading(false);
    }
  }, [token, refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        console.log('AuthContext: Calling login API...');
        // Backend returns token and user at root level, not in data
        const res = await api.post<{ token: string; user: User; message?: string }>('/api/auth/login', {
          email,
          password,
        });
        console.log('AuthContext: API response:', res);
        
        // Type assertion to access root-level properties
        const loginRes = res as { success: boolean; token?: string; user?: User; message?: string };
        
        if (loginRes.success && loginRes.token && loginRes.user) {
          console.log('AuthContext: Login successful, storing token and user');
          api.setToken(loginRes.token);
          api.setUser(loginRes.user);
          setToken(loginRes.token);
          setUser(loginRes.user);
          return { success: true, user: loginRes.user, message: loginRes.message };
        }
        console.log('AuthContext: Login failed, no token/user');
        return { success: false, message: loginRes.message || 'Invalid credentials' };
      } catch (e) {
        console.error('AuthContext: Login error:', e);
        return { success: false, message: e instanceof Error ? e.message : 'Login failed' };
      }
    },
    [user]
  );

  const logout = useCallback(() => {
    api.clearToken();
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, tokenStorage } from '@/lib/api';

export type UserRole = 'CISO_ADMIN' | 'SECURITY_ASSESSOR' | 'AUDITOR' | 'CABINET_VIEWER';

export interface CouncilTenant {
  id: string;
  name: string;
  authority_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  tenant?: CouncilTenant;
}

interface AuthContextType {
  user: User | null;
  tenant: CouncilTenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isDemo: boolean;
}

const DEFAULT_DEMO_USER: User = {
  id: 'usr-demo-001',
  email: 'ciso@borsetshire.gov.uk',
  full_name: 'Arthur Pendelton',
  role: 'CISO_ADMIN',
  tenant_id: 'ten-borsetshire-001',
  tenant: {
    id: 'ten-borsetshire-001',
    name: 'Borsetshire Council',
    authority_type: 'UNITARY',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<CouncilTenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemo, setIsDemo] = useState<boolean>(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
      if (userData.tenant) {
        setTenant(userData.tenant);
      }
      setIsDemo(false);
    } catch {
      // If token exists but failed, clear
      if (tokenStorage.getAccessToken()) {
        tokenStorage.clearTokens();
      }
      // Provide demo user as resilient fallback for initial design exploration
      setUser(DEFAULT_DEMO_USER);
      setTenant(DEFAULT_DEMO_USER.tenant || null);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // OAuth2 Password form format
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const data = await api.post<{
        access_token: string;
        refresh_token: string;
        token_type: string;
      }>('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        skipAuth: true,
      });

      tokenStorage.setTokens(data.access_token, data.refresh_token);
      await fetchCurrentUser();
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, [fetchCurrentUser]);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      fetchCurrentUser();
    } else {
      // Auto-login with seeded demo credentials for frictionless access
      login('ciso@borsetshire.gov.uk', 'Borsetshire2025!').catch(() => {
        // Fallback demo user if API is unreachable
        setUser(DEFAULT_DEMO_USER);
        setTenant(DEFAULT_DEMO_USER.tenant || null);
        setIsDemo(true);
        setIsLoading(false);
      });
    }
  }, [fetchCurrentUser, login]);

  const logout = () => {
    tokenStorage.clearTokens();
    setUser(null);
    setTenant(null);
    setIsDemo(false);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        isDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

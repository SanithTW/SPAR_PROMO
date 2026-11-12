import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleType } from '../types/index.js';
import * as authService from '../services/authService.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, passwordPlain: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (roles: RoleType[]) => boolean;
  isStaff: boolean;
  isHead: boolean;
  isMarketing: boolean;
  isAdmin: boolean;
  isMasterData: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('spar_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('spar_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('spar_token');
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authService.getMeApi();
      if (!profile.active) {
        throw new Error('Account inactive');
      }
      setUser(profile);
      localStorage.setItem('spar_user', JSON.stringify(profile));
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('spar_token');
      localStorage.removeItem('spar_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email: string, passwordPlain: string): Promise<User> => {
    setIsLoading(true);
    try {
      const result = await authService.loginApi(email, passwordPlain);
      setToken(result.token);
      setUser(result.user);
      localStorage.setItem('spar_token', result.token);
      localStorage.setItem('spar_user', JSON.stringify(result.user));
      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logoutApi();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('spar_token');
      localStorage.removeItem('spar_user');
      setIsLoading(false);
    }
  };

  const hasRole = (roles: RoleType[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isStaff = user?.role === 'STAFF';
  const isHead = user?.role === 'HEAD';
  const isMarketing = user?.role === 'MARKETING';
  const isAdmin = user?.role === 'ADMIN';
  const isMasterData = user?.role === 'MASTER_DATA';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        hasRole,
        isStaff,
        isHead,
        isMarketing,
        isAdmin,
        isMasterData,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

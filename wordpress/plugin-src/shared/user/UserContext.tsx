// shared/user/UserContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { User } from './types';
import { isTokenExpired } from './jwt';

type Maybe<T> = T | null;

type UserContextType = {
  token: Maybe<string>;
  user: Maybe<User>;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setToken: (t: Maybe<string>) => void;
};

const AUTH_TOKEN_KEY = 'authToken';
const USER_INFO_KEY = 'userInfo';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setTokenState] = useState<Maybe<string>>(null);
  const [user, setUser] = useState<Maybe<User>>(null);

  const isLoggedIn = !!token;

  // DEBUG
  useEffect(() => {
    console.log('[User] DEBUG token changed:', token);
  }, [token]);

  useEffect(() => {
    console.log('[User] DEBUG user changed:', user);
  }, [user]);

  // Boot from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = window.localStorage.getItem(USER_INFO_KEY);

    if (storedToken && !isTokenExpired(storedToken)) {
      setTokenState(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
    } else {
      // purge invalid
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(USER_INFO_KEY);
      setTokenState(null);
      setUser(null);
    }
  }, []);

  // Runtime token guard
  useEffect(() => {
    if (!token) return;

    if (isTokenExpired(token)) {
      setTokenState(null);
      setUser(null);
      return;
    }

    const id = window.setInterval(() => {
      setTokenState(prev => {
        if (prev && isTokenExpired(prev)) {
          console.log('[User] token expired during poll, clearing');
          setUser(null);
          return null;
        }
        return prev;
      });
    }, 30_000);

    return () => window.clearInterval(id);
  }, [token]);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY) {
        const newToken = e.newValue;
        if (!newToken || isTokenExpired(newToken)) {
          setTokenState(null);
          setUser(null);
        } else {
          setTokenState(newToken);
        }
      }
      if (e.key === USER_INFO_KEY) {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Persist token
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, [token]);

  // Persist user
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user) {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_INFO_KEY);
    }
  }, [user]);

  const login = (tok: string, u: User) => {
    setTokenState(tok);
    setUser(u);
    console.log('[UserProvider] login called');
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(USER_INFO_KEY);
      // IMPORTANT: we do NOT touch the demo resume flag here.
    }

    console.log('[UserProvider] logout called');
  };

  const setToken = (t: Maybe<string>) => setTokenState(t);

  return (
    <UserContext.Provider
      value={{
        token,
        user,
        isLoggedIn,
        login,
        logout,
        setToken,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

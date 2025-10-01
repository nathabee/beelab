// shared/user/UserContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { User } from "./types";
import { isTokenExpired } from './jwt';


type Maybe<T> = T | null;

type UserContextType = {
  // auth
  token: Maybe<string>;
  user: Maybe<User>;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setToken: (t: Maybe<string>) => void;

}; 

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  
  // boot from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("authToken");
    const u = localStorage.getItem("userInfo");

    // manage token expiricy
    if (t) {
      // If expired at boot, purge immediately
      if (isTokenExpired(t)) {
        localStorage.removeItem('authToken');
      } else {
        setTokenState(t);
      }
    }
    
    if (u) setUser(JSON.parse(u));

  }, []);


  // runtime token guard: clear when token expires (poll every 30s)
  useEffect(() => {
    if (!token) return;
    if (isTokenExpired(token)) {
      setTokenState(null);
      return;
    }
    const id = setInterval(() => {
      setTokenState(prev => {
        if (prev && isTokenExpired(prev)) return null;
        return prev;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [token]);

  // respond to storage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        const newToken = e.newValue;
        if (!newToken || isTokenExpired(newToken)) {
          setTokenState(null);
        } else {
          setTokenState(newToken);
        }
      }
      if (e.key === 'userInfo') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (token)
      localStorage.setItem("authToken", token);
    else localStorage.removeItem("authToken");
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) localStorage.setItem("userInfo", JSON.stringify(user));
    else localStorage.removeItem("userInfo");
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
    [
      'authToken',
      'userInfo',
    ].forEach(k => localStorage.removeItem(k));
  }

  console.log('[UserProvider] logout called');
};

  const setToken = (t: Maybe<string>) => setTokenState(t);


  return (
    <UserContext.Provider value={{
      token, user, isLoggedIn, login, logout, setToken,

    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};

'use client';

// src/context/AppContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import type { InfoResponse, InfoMe } from '@mytypes/info';

interface AppContextType {
  reset: () => void;

  info: InfoResponse | null;
  setInfo: (info: InfoResponse | null) => void;

  me: InfoMe | null;
  setMe: (me: InfoMe | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [info, internalSetInfo] = useState<InfoResponse | null>(null);
  const [me, internalSetMe] = useState<InfoMe | null>(null);

  // boot app state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawInfo = localStorage.getItem('info');
    if (rawInfo) {
      try {
        internalSetInfo(JSON.parse(rawInfo));
      } catch {
        localStorage.removeItem('info');
      }
    }

    const rawMe = localStorage.getItem('me');
    if (rawMe) {
      try {
        internalSetMe(JSON.parse(rawMe));
      } catch {
        localStorage.removeItem('me');
      }
    }
  }, []);

  const setInfo = useCallback((next: InfoResponse | null) => {
    internalSetInfo(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('info');
      else localStorage.setItem('info', JSON.stringify(next));
    }
  }, []);

  const setMe = useCallback((next: InfoMe | null) => {
    internalSetMe(next);
    if (typeof window !== 'undefined') {
      if (next === null) localStorage.removeItem('me');
      else localStorage.setItem('me', JSON.stringify(next));
    }
  }, []);

  // app-only reset (does not touch auth)
  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;

    ['info', 'me'].forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('nutshell_')) localStorage.removeItem(k);
    });

    internalSetInfo(null);
    internalSetMe(null);
  }, []);

  const value = useMemo(
    () => ({
      info,
      setInfo,
      me,
      setMe,
      reset,
    }),
    [info, setInfo, me, setMe, reset],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

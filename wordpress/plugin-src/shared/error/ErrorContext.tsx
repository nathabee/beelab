// shared/error/ErrorContext.tsx
'use client'; // harmless in WP, needed only for Next.js app router
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { errorBus } from './errorBus';
import type { AppError } from './types';

type Ctx = {
  last: AppError | null;
  stack: AppError[];
  clear: () => void;
  dismissLast: () => void;
};
const ErrorCtx = createContext<Ctx | null>(null);

export const ErrorProvider: React.FC<{ children: React.ReactNode; errorPath?: string }> = ({
  children,
  errorPath = '/error',
}) => {
  // hydrate from sessionStorage
  const [stack, setStack] = useState<AppError[]>(() => {
    try {
      const raw = sessionStorage.getItem('bee_errors');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const last = stack.at(-1) ?? null;

  const nav = useNavigate();
  const loc = useLocation();
  const unsubRef = useRef<() => void>();

  useEffect(() => {
    unsubRef.current = errorBus.on((e: AppError) => {
      setStack(prev => {
        const next = [...prev, e];
        try { sessionStorage.setItem('bee_errors', JSON.stringify(next.slice(-20))); } catch {}
        return next;
      });

      // Only redirect for page-level (or 4xx/5xx), and avoid loops
      const needsRedirect = e.severity === 'page' || (e.httpStatus && e.httpStatus >= 400);
      const alreadyOnError = loc.pathname === errorPath;
      if (needsRedirect && !alreadyOnError) {
        setTimeout(() => nav(errorPath), 0);
      }
    });
    return () => unsubRef.current?.();
  }, [nav, loc.pathname, errorPath]);

  const clear = () => {
    setStack([]);
    try { sessionStorage.removeItem('bee_errors'); } catch {}
  };

  const dismissLast = () => {
    setStack(prev => prev.slice(0, -1));
    try {
      const next = stack.slice(0, -1);
      sessionStorage.setItem('bee_errors', JSON.stringify(next));
    } catch {}
  };

  const value = useMemo<Ctx>(() => ({ last, stack, clear, dismissLast }), [last, stack]);
  return <ErrorCtx.Provider value={value}>{children}</ErrorCtx.Provider>;
};

export const useErrors = () => {
  const ctx = useContext(ErrorCtx);
  if (!ctx) throw new Error('useErrors must be used inside ErrorProvider');
  return ctx;
};

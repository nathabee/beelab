// _shared/error/ErrorContext.tsx (or wherever your provider lives)
'use client';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { errorBus } from './errorBus';
import type { AppError } from './types';

type Ctx = {
  last: AppError | null;
  stack: AppError[];
  clear: () => void;
};
const ErrorCtx = createContext<Ctx | null>(null);

export const ErrorProvider: React.FC<{ children: React.ReactNode; errorPath?: string }> = ({ children, errorPath = '/error' }) => {
  const [stack, setStack] = useState<AppError[]>([]);
  const last = stack.at(-1) ?? null;

  const nav = useNavigate();
  const loc = useLocation();
  const unsubRef = useRef<() => void>();

  /*
  useEffect(() => {
    // subscribe once
    unsubRef.current = errorBus.on((e: AppError) => {
      setStack(prev => [...prev, e]);

      // Only force page-level redirect if needed
      if (e.severity === 'page' || (e.httpStatus && e.httpStatus >= 400)) {
        if (!loc.pathname.startsWith('/pomolobee_error')) {
          // do it on next tick to avoid setState-during-render pitfalls
          setTimeout(() => {
            nav('/pomolobee_error', { state: { errorId: e.id } });
          }, 0);
        }
      }
    });
    return () => { unsubRef.current?.(); };
  }, [nav, loc.pathname]);
*/
  useEffect(() => {
    unsubRef.current = errorBus.on((e) => {
      setStack(prev => [...prev, e]);
      if (e.severity === 'page' || (e.httpStatus && e.httpStatus >= 400)) {
        setTimeout(() => {
          nav(errorPath);      // ← no more hardcoded '/pomolobee_error'
        }, 0);
      }
    });
    return () => unsubRef.current?.();
  }, [nav, errorPath]);

  // inside ErrorProvider
  useEffect(() => {
    const id = Math.random().toString(36).slice(2, 8);
    console.log('[ErrorProvider] mount', id);
    return () => console.log('[ErrorProvider] unmount', id);
  }, []);


  const clear = () => setStack([]);

  const value = useMemo<Ctx>(() => ({ last, stack, clear }), [last, stack]);
  return <ErrorCtx.Provider value={value}>{children}</ErrorCtx.Provider>;
};

export const useErrors = () => {
  const ctx = useContext(ErrorCtx);
  if (!ctx) throw new Error('useErrors must be used inside ErrorProvider');
  return ctx;
};

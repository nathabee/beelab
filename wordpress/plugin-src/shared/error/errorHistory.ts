// shared/error/errorHistory.ts
'use client';

import { useEffect, useState } from 'react';
import { errorBus } from './errorBus';  

export type AppErrorLike = {
  id?: string;
  code?: string;
  message?: string;
  severity?: string;
  category?: string;
  service?: string;
  functionName?: string;
  meta?: Record<string, any>;
};

export type StoredAppError = {
  id: string;
  ts: number; // epoch ms
  code?: string;
  message: string;
  severity?: string;
  category?: string;
  service?: string;
  functionName?: string;
  meta?: Record<string, any>;
};

const LS_KEY = 'bee:errorHistory:v1';

type Listener = (all: StoredAppError[]) => void;

let store: StoredAppError[] = [];
let listeners: Set<Listener> = new Set();
let bootstrapped = false;

function loadFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) store = JSON.parse(raw);
  } catch {
    // ignore
  }
}

function saveToStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors etc.
  }
}

function notify() {
  for (const l of listeners) l([...store]);
}

function ensureBootstrapped() {
  if (bootstrapped) return;
  bootstrapped = true;
  loadFromStorage();
  // Subscribe once to the bus
  errorBus.on?.((err: AppErrorLike) => {
    const item: StoredAppError = {
      id: err?.id || `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ts: Date.now(),
      code: err?.code,
      message: err?.message || 'Unknown error',
      severity: err?.severity,
      category: err?.category,
      service: err?.service,
      functionName: err?.functionName,
      meta: err?.meta,
    };
    store.push(item);
    // cap the history (keep last 500)
    if (store.length > 500) store = store.slice(-500);
    saveToStorage();
    notify();
  });
}

export function getAllErrors(): StoredAppError[] {
  ensureBootstrapped();
  return [...store];
}

export function clearAllErrors() {
  ensureBootstrapped();
  store = [];
  saveToStorage();
  notify();
}

export function removeError(id: string) {
  ensureBootstrapped();
  store = store.filter(e => e.id !== id);
  saveToStorage();
  notify();
}

export function useErrorHistory(filter?: { plugin?: string; limit?: number }) {
  ensureBootstrapped();
  const compute = () => {
    let all = [...store].sort((a, b) => b.ts - a.ts);
    if (filter?.plugin) {
      all = all.filter(e => {
        const p =
          e.meta?.plugin ||
          e.meta?.app ||
          e.meta?.source ||
          e.service; // fallback
        return String(p || '').toLowerCase() === filter.plugin!.toLowerCase();
      });
    }
    if (filter?.limit) all = all.slice(0, filter.limit);
    return all;
  };

  const [items, setItems] = useState<StoredAppError[]>(compute());

  useEffect(() => {
    const listener: Listener = () => setItems(compute());
    listeners.add(listener);
    // initial recompute in case filter changed since mount
    setItems(compute());
    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.plugin, filter?.limit]);

  return items;
}

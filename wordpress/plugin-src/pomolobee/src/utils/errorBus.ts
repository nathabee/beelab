// src/utils/errorBus.ts
import type { AppError } from '@mytypes/error';

type Listener = (e: AppError) => void;

const listeners = new Set<Listener>();

export const errorBus = {
  on(fn: Listener)  { listeners.add(fn); return () => listeners.delete(fn); },
  emit(e: AppError) { for (const l of listeners) l(e); },
};

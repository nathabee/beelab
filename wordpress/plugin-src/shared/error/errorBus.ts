// shared/error/errorBus.ts
export type Listener<T = any> = (e: T) => void;

function createBus<T = any>() {
  const listeners = new Set<Listener<T>>();

  return {
    on(fn: Listener<T>) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit(e: T) {
      for (const l of Array.from(listeners)) l(e);
    },
    clear() {
      listeners.clear();
    },
  };
}

// Ensure ONE shared instance per page (even with multiple plugin mounts)
const KEY = '__bee_error_bus__';
const g = globalThis as any;

export const errorBus = (g[KEY] ??= createBus());
export type ErrorBus = typeof errorBus;

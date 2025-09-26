// src/utils/api.ts
import axios, { AxiosInstance } from 'axios';
import { toAppError, errorBus } from '@bee/common/error';
import { getTokenFromStorage } from '@utils/jwt';


// ---- helpers ---------------------------------------------------------------
const norm = (u: string) => u.replace(/\/+$/, '');
const join = (base: string, path: string) =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/** Strict: either return a base URL or throw. */
function getBaseApiStrict(): string {
  // 1) WordPress-localized (plugin script)
  if (typeof window !== 'undefined') {
    const wpApi = (window as any)?.pomolobeeSettings?.apiUrl;
    if (wpApi) return norm(wpApi);
  }
  // 2) Build-time env (dev / storybook / tests)
  const envApi =
    (import.meta as any)?.env?.VITE_POMOLOBEE_API_BASE ||
    (process as any)?.env?.POMOLOBEE_API_BASE;
  if (envApi) return norm(String(envApi));

  // 3) Nothing found → throw. Caller will normalize with toAppError.
  throw new Error('No API base configured');
}

/** Loose: returns base or null (so we can precompute a nice app error). */
function getBaseApiLoose(): string | null {
  try {
    return getBaseApiStrict();
  } catch {
    return null;
  }
}

// ---- base + pre-normalized missing-base error ------------------------------
const BASE = getBaseApiLoose();
const BASE_ERR = !BASE
  ? toAppError(new Error('API base is missing'), {
      code: 'NO_BASE_API',
      severity: 'page',
      category: 'network',
      functionName: 'getBaseApiStrict',
      service: 'config',
      message:
        'API is not configured. Please check plugin settings or environment variables.',
      retryable: false,
    })
  : null;

// ---- axios instances -------------------------------------------------------
export const apiUser: AxiosInstance = axios.create({
  baseURL: BASE ? join(BASE, '/user') : '/__invalid_base__',
  timeout: 15000,
  withCredentials: true,
});

export const apiPom: AxiosInstance = axios.create({
  baseURL: BASE ? join(BASE, '/pomolobee') : '/__invalid_base__',
  timeout: 15000,
  withCredentials: true,
});

// ---- interceptors ----------------------------------------------------------
// Request: if base missing, fail fast with the same normalized error.
// Also add WP nonce when available.
for (const client of [apiPom, apiUser]) {
  client.interceptors.request.use((config) => {
    if (BASE_ERR) {
      // reject early so callers get a clear, normalized error
      return Promise.reject(BASE_ERR);
    }
    const nonce =
      (window as any)?.beeNonce ||
      (window as any)?.pomolobeeSettings?.nonce ||
      null;
    if (nonce) {
      config.headers = { ...(config.headers || {}), 'X-WP-Nonce': nonce };
    }
    return config;
  });
}

// Response: normalize any axios error, emit on the bus, rethrow AppError.
for (const [client, service] of [
  [apiPom, 'pomolobee'],
  [apiUser, 'user'],
] as const) {
  client.interceptors.response.use(
    (r) => r,
    (err) => {
      // if something upstream already passed an AppError, keep it
      const appErr = err?.id ? err : toAppError(err, { service, functionName: 'axios' });
      errorBus.emit(appErr);
      return Promise.reject(appErr);
    }
  );
}

// ---- misc ------------------------------------------------------------------
export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// shared/user/http.ts
import axios, { AxiosInstance } from 'axios';
import { toAppError } from '@bee/common'; // adjust path if your barrel re-exports these
import { errorBus } from '@bee/common'; // adjust path if your barrel re-exports these
 

type BaseEnvConfig = {
  settingsKey?: string;
  settingsProp?: string;
  envVars?: string[];
};

const norm = (u: string) => u.replace(/\/+$/, '');
export const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export function resolveBaseUrl(cfg?: BaseEnvConfig): string | null {
  const settingsKey = cfg?.settingsKey ?? 'beeSettings';
  const settingsProp = cfg?.settingsProp ?? 'apiUrl';
  const envVars = cfg?.envVars ?? ['VITE_BEE_API_BASE', 'BEE_API_BASE'];

  if (typeof window !== 'undefined') {
    const s = (window as any)?.[settingsKey]?.[settingsProp];
    if (s) return norm(String(s));
  }
  const im = (import.meta as any)?.env;
  for (const v of envVars) {
    const val = im?.[v] ?? (process as any)?.env?.[v];
    if (val) return norm(String(val));
  }
  return null;
}

export function getWpNonce(possibleKeys: string[] = ['beeNonce', 'pomolobeeSettings']) {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w.beeNonce) return w.beeNonce as string;
  for (const key of possibleKeys) {
    const maybe = w[key]?.nonce;
    if (maybe) return String(maybe);
  }
  return null;
}

export type CreateAxiosClientOptions = {
  baseUrl: string | null;
  basePath: string;               // e.g. '/user' or '/pomolobee'
  service: string;                // appears in normalized errors
  nonceKeys?: string[];
  timeoutMs?: number;
  /** Extra metadata to attach to EVERY normalized error (e.g. { plugin: 'pomolobee' }) */
  meta?: Record<string, any>;
};

export function createAxiosClient(opts: CreateAxiosClientOptions): AxiosInstance {
  const { baseUrl, basePath, service, nonceKeys, timeoutMs = 15000, meta } = opts;

  const BASE_ERR = !baseUrl
    ? toAppError(new Error('API base is missing'), {
        code: 'NO_BASE_API',
        severity: 'page',
        category: 'network',
        functionName: 'createAxiosClient',
        service: 'config',
        message: 'API is not configured. Check plugin settings or environment variables.',
        retryable: false,
        ...(meta ? { meta } : {}),
      })
    : null;

  const instance = axios.create({
    baseURL: baseUrl ? joinUrl(baseUrl, basePath) : '/__invalid_base__',
    timeout: timeoutMs,
    withCredentials: true,
  });

  instance.interceptors.request.use((config) => {
    if (BASE_ERR) return Promise.reject(BASE_ERR);
    const nonce = getWpNonce(nonceKeys);
    if (nonce) {
      config.headers = { ...(config.headers || {}), 'X-WP-Nonce': nonce };
    }
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
    (err) => {
      // Keep pre-normalized AppErrors, otherwise normalize and attach default meta
      const appErr = err?.id
        ? err
        : toAppError(err, {
            service,
            functionName: 'axios',
            ...(meta ? { meta } : {}),
          });
      errorBus.emit(appErr);
      return Promise.reject(appErr);
    }
  );

  return instance;
}

export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

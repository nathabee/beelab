// src/utils/api.ts
import axios from 'axios';
import { toAppError, errorBus } from '../../shared/error';

// --- helpers ---
const norm = (u: string) => u.replace(/\/+$/, '');
const join = (base: string, path: string) =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

/** Strict: either return a base URL or throw. */
function getBaseApiStrict(): string {
  // 1) WordPress-localized (plugin)
  if (typeof window !== 'undefined') {
    const wpApi = (window as any)?.pomolobeeSettings?.apiUrl;
    if (wpApi) return norm(wpApi);

    // 2) Optional meta override
    const meta = document.querySelector('meta[name="pomolobee-api-base"]') as HTMLMetaElement | null;
    if (meta?.content) return norm(meta.content);
  }

  // 3) Front-end env
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return norm(process.env.NEXT_PUBLIC_API_URL);
  }

  // ❌ Required config missing — throw (and we’ll also emit below)
  throw new Error('Missing API base configuration (pomolobeeSettings.apiUrl or meta[pomolobee-api-base] or NEXT_PUBLIC_API_URL).');
}

/** Resolve base URL once, but *don’t* crash module load; emit + remember the error. */
let BASE: string | null = null;
let BASE_ERR: any = null;
try {
  BASE = getBaseApiStrict();
} catch (e) {
  BASE_ERR = toAppError(e, { service: 'config', severity: 'page' });
  errorBus.emit(BASE_ERR); // trigger your UI (banner/page redirect)
  BASE = null;             // mark as unresolved
}

// Two axios clients (unchanged public API)
export const apiUser = axios.create({
  baseURL: BASE ? join(BASE, '/user') : '/__invalid_base__',
  timeout: 15000,
  withCredentials: true,
});

export const apiPom = axios.create({
  baseURL: BASE ? join(BASE, '/pomolobee') : '/__invalid_base__',
  timeout: 15000,
  withCredentials: true,
});

// Request interceptor: if base config missing, immediately fail any call with the same app error.
for (const client of [apiPom, apiUser]) {
  client.interceptors.request.use((config) => {
    if (BASE_ERR) {
      // Reject early so callers get a clear, normalized error
      return Promise.reject(BASE_ERR);
    }
    // WP nonce if available
    const nonce = (window as any)?.beeNonce || (window as any)?.pomolobeeSettings?.nonce;
    if (nonce) {
      config.headers = { ...(config.headers || {}), 'X-WP-Nonce': nonce };
    }
    return config;
  });
}

// Unified response error handling (unchanged behavior)
for (const [client, service] of [[apiPom, 'pomolobee'], [apiUser, 'user']] as const) {
  client.interceptors.response.use(
    r => r,
    (err) => {
      // if config error already normalized, it will pass through as-is
      const appErr = err?.id ? err : toAppError(err, { service, functionName: 'axios' });
      errorBus.emit(appErr);
      return Promise.reject(appErr);
    }
  );
}


export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

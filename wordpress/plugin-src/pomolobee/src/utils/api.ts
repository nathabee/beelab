// src/utils/api.ts 
import axios from 'axios';
import { toAppError } from '@utils/toAppError';
import { errorBus } from '@utils/errorBus';

function norm(u: string) {
  return u.replace(/\/+$/, ""); // strip trailing slash
}

function join(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function getBaseApi(): string {
  // 1) WordPress-localized (plugin)
  if (typeof window !== "undefined") {
    const wpApi = (window as any)?.pomolobeeSettings?.apiUrl;
    if (wpApi) return norm(wpApi);
    // 2) Optional meta override <meta name="pomolobee-api-base" content="https://api.example.com/api">
    const meta = document.querySelector('meta[name="pomolobee-api-base"]') as HTMLMetaElement | null;
    if (meta?.content) return norm(meta.content);
  }

  // 3) Next.js / front-end env (public)
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return norm(process.env.NEXT_PUBLIC_API_URL);
  }

  // 4) Fallback (dev)
  return "http://localhost:9001/api";
}

// Two clear axios clients, one per namespace
export const apiUser = axios.create({
  baseURL: join(getBaseApi(), "/user"),
  timeout: 15000,
  withCredentials: true,
});

export const apiPom = axios.create({
  baseURL: join(getBaseApi(), "/pomolobee"),
  timeout: 15000,
});

// Optional helper if you don't use interceptors
export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

 

// unified response error handling
for (const [client, service] of [[apiPom, 'pomolobee'], [apiUser, 'user']] as const) {
  client.interceptors.response.use(
    (r) => r,
    (err) => {
      const appErr = toAppError(err, {
        service,
        functionName: 'axios',
        // component left blank; components may add it if they rethrow
      });
      errorBus.emit(appErr);
      return Promise.reject(appErr); // so local callers can still handle inline if they want
    }
  );
}

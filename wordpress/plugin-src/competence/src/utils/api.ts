// src/utils/api.ts
import axios from "axios";

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
});

export const apiComp = axios.create({
  baseURL: join(getBaseApi(), "/competence"),
  timeout: 15000,
});

// Optional helper if you don't use interceptors
export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

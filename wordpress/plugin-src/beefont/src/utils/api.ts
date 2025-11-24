// src/utils/api.ts
import type { AxiosInstance } from 'axios';
import {
  resolveBaseUrl,
  createAxiosClient,
  authHeaders as _authHeaders,
} from '@bee/common';

/**
 * API_BASE = e.g. "http://localhost:9082/api"
 *
 * Comes from:
 *   - window.beefontSettings.apiUrl
 *   - or env vars VITE_BEEFONT_API_BASE / BEEFONT_API_BASE
 */
const API_BASE_RAW = resolveBaseUrl({
  settingsKey: 'beefontSettings',
  settingsProp: 'apiUrl',
  envVars: ['VITE_BEEFONT_API_BASE', 'BEEFONT_API_BASE'],
});

// normalize: strip trailing slashes
const API_BASE = (API_BASE_RAW || '').replace(/\/+$/, '');

const pluginTag = { plugin: 'beefont' };

// Dedicated client for user-related operations (me, roles, users, auth, etc.)
export const apiUser: AxiosInstance = createAxiosClient({
  baseUrl: API_BASE,
  basePath: '/user',
  service: 'user',
  nonceKeys: ['beeNonce', 'beefontSettings'],
  meta: pluginTag,
});

// App-level client; same backend, separate "service" tag
export const apiApp: AxiosInstance = createAxiosClient({
  baseUrl: API_BASE,
  basePath: '/beefont',
  service: 'beefont',
  nonceKeys: ['beeNonce', 'beefontSettings'],
  meta: pluginTag,
});

export const authHeaders = _authHeaders;

/**
 * MEDIA_BASE:
 *
 * If API_BASE ends with "/api" → replace with "/media"
 *   "http://localhost:9082/api" -> "http://localhost:9082/media"
 *
 * Otherwise → append "/media"
 *   "http://localhost:9082"     -> "http://localhost:9082/media"
 */
const MEDIA_BASE = API_BASE.match(/\/api$/)
  ? API_BASE.replace(/\/api$/, '/media')
  : `${API_BASE}/media`;

/**
 * Build full absolute URL for a BeeFont APP endpoint.
 *
 * Example:
 *   buildAppUrl('/jobs/<sid>/download/ttf/de/')
 *   -> "http://localhost:9082/api/beefont/jobs/<sid>/download/ttf/de/"
 */
export function buildAppUrl(path: string): string {
  const base = `${API_BASE}/beefont`.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return base + suffix;
}

/**
 * Build full absolute URL for MEDIA files.
 *
 * Example:
 *   buildMediaUrl('beefont/jobs/<sid>/glyphs/A_v0.png')
 *   -> "http://localhost:9082/media/beefont/jobs/<sid>/glyphs/A_v0.png"
 */
export function buildMediaUrl(relPath: string): string {
  const base = MEDIA_BASE.replace(/\/+$/, '');
  const rel = relPath.startsWith('/') ? relPath : `/${relPath}`;
  return base + rel;
}

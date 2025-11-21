// src/utils/api.ts
import type { AxiosInstance } from 'axios';
import {
  resolveBaseUrl,
  createAxiosClient,
  authHeaders as _authHeaders,
} from '@bee/common';

/**
 * All BeeFont traffic goes to the BeeLab UserCore / auth API.
 *
 * The base URL is injected via:
 *  - window.beefontSettings.apiUrl  (from PHP / WP)
 *  - or the env vars VITE_BEEFONT_API_BASE / BEEFONT_API_BASE
 *
 * apiUser  -> generic client for user / auth endpoints (/users/, /me/, /roles/, /auth/...)
 * apiApp   -> same base, used for app-level calls (example: GET /hello/).
 */

const BASE = resolveBaseUrl({
  settingsKey: 'beefontSettings',
  settingsProp: 'apiUrl',
  envVars: ['VITE_BEEFONT_API_BASE', 'BEEFONT_API_BASE'],
});

const pluginTag = { plugin: 'beefont' };

// Dedicated client for user-related operations (me, roles, users, auth, etc.)
export const apiUser: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',           // expects routes like /users/, /me/, /roles/, /auth/login/, ...
  service: 'user',
  nonceKeys: ['beeNonce', 'beefontSettings'],
  meta: pluginTag,
});

// App-level client; same backend, separate "service" tag so errors/logging can distinguish calls.
export const apiApp: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/beefont',           // same base; example: GET /hello/ will hit the 'hello' view in UserCore
  service: 'beefont',
  nonceKeys: ['beeNonce', 'beefontSettings'],
  meta: pluginTag,
});

export const authHeaders = _authHeaders;

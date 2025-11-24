// src/utils/api.ts
import type { AxiosInstance } from 'axios';
import {
  resolveBaseUrl,
  createAxiosClient,
  authHeaders as _authHeaders,
} from '@bee/common';

/**
 * All Nutshell traffic goes to the BeeLab UserCore / auth API.
 *
 * The base URL is injected via:
 *  - window.nutshellSettings.apiUrl  (from PHP / WP)
 *  - or the env vars VITE_NUTSHELL_API_BASE / NUTSHELL_API_BASE
 *
 * apiUser  -> generic client for user / auth endpoints (/users/, /me/, /roles/, /auth/...)
 * apiApp   -> same base, used for app-level calls (example: GET /hello/).
 */

const BASE = resolveBaseUrl({
  settingsKey: 'nutshellSettings',
  settingsProp: 'apiUrl',
  envVars: ['VITE_NUTSHELL_API_BASE', 'NUTSHELL_API_BASE'],
});

const pluginTag = { plugin: 'nutshell' };

// Dedicated client for user-related operations (me, roles, users, auth, etc.)
export const apiUser: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',           // expects routes like /users/, /me/, /roles/, /auth/login/, ...
  service: 'user',
  nonceKeys: ['beeNonce', 'nutshellSettings'],
  meta: pluginTag,
});

// App-level client; same backend, separate "service" tag so errors/logging can distinguish calls.
export const apiApp: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',           // same base; example: GET /hello/ will hit the 'hello' view in UserCore
  service: 'nutshell',
  nonceKeys: ['beeNonce', 'nutshellSettings'],
  meta: pluginTag,
});

export const authHeaders = _authHeaders;

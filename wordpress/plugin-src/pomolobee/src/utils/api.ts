// src/utils/api.ts
import type { AxiosInstance } from 'axios';
import {
  resolveBaseUrl,
  createAxiosClient,
  authHeaders as _authHeaders,
} from '@bee/common';

const BASE = resolveBaseUrl({
  settingsKey: 'pomolobeeSettings',
  settingsProp: 'apiUrl',
  envVars: ['VITE_POMOLOBEE_API_BASE', 'POMOLOBEE_API_BASE'],
});

const pluginTag = { plugin: 'pomolobee' };

export const apiUser: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',
  service: 'user',
  nonceKeys: ['beeNonce', 'pomolobeeSettings'],
  meta: pluginTag, 
});

export const apiApp: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/pomolobee',
  service: 'pomolobee',
  nonceKeys: ['beeNonce', 'pomolobeeSettings'],
  meta: pluginTag,  
});

export const authHeaders = _authHeaders;

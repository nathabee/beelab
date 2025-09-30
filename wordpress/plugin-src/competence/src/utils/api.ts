// src/utils/api.ts
import type { AxiosInstance } from 'axios';
import {
  resolveBaseUrl,
  createAxiosClient,
  authHeaders as _authHeaders,
} from '@bee/common';

const BASE = resolveBaseUrl({
  settingsKey: 'competenceSettings',
  settingsProp: 'apiUrl',
  envVars: ['VITE_COMPETENCE_API_BASE', 'COMPETENCE_API_BASE'],
});

const pluginTag = { plugin: 'competence' };

export const apiUser: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/user',
  service: 'user',
  nonceKeys: ['beeNonce', 'competenceSettings'],
  meta: pluginTag, 
});

export const apiApp: AxiosInstance = createAxiosClient({
  baseUrl: BASE,
  basePath: '/competence',
  service: 'competence',
  nonceKeys: ['beeNonce', 'competenceSettings'],
  meta: pluginTag,  
});

export const authHeaders = _authHeaders;

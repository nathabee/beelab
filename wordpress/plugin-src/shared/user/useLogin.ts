// shared/user/useLogin.ts
'use client';

import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { useUser } from './UserContext';
import { authHeaders } from './http';
import { LangCode } from './lang';

// export type LangCode = 'en' | 'fr' | 'de' | 'bz';
export type BootstrapOpts = { force?: boolean };
export type BootstrapFn = (token: string, opts?: BootstrapOpts) => Promise<void> | void;

export type DemoOpts = {
  roles?: string[];
  preferredName?: string;
  lang?: LangCode;
};

export function useLoginHandler(opts: { apiUser: AxiosInstance; bootstrap?: BootstrapFn }) {
  const { apiUser, bootstrap } = opts;
  const { login } = useUser();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string, onSuccess: () => void) => {
    try {
      const authResp = await apiUser.post('/auth/login/', { username, password });
      const { access: token } = authResp.data;

      const meResp = await apiUser.get('/users/me/', { headers: authHeaders(token) });
      const userInfo = meResp.data;

      login(token, userInfo);
      if (bootstrap) await bootstrap(token, { force: true });
      onSuccess();
    } catch (e: any) {
      if (e?.response?.status === 401) setErrorMessage('Invalid username or password');
      else if (e?.response?.status === 403) setErrorMessage('Your account is not permitted to access this application.');
      else setErrorMessage('Connection error');
      console.error('Login failed:', e?.response?.status, e?.response?.data || e);
    }
  };

  const handleDemoStart = async (onSuccess: () => void, demo: DemoOpts = {}) => {
    try {
      const body: any = { roles: Array.isArray(demo.roles) && demo.roles.length ? demo.roles : ['teacher'] };
      if (demo.preferredName?.trim()) body.preferred_name = demo.preferredName.trim();
      if (demo.lang) body.lang = demo.lang;

      const startResp = await apiUser.post('/auth/demo/start/', body, { withCredentials: true });
      const { access: token } = startResp.data;

      const meResp = await apiUser.get('/users/me/', { headers: authHeaders(token), withCredentials: true });
      const userInfo = meResp.data;

      login(token, userInfo);
      if (bootstrap) await bootstrap(token, { force: true });
      onSuccess();
    } catch (e: any) {
      setErrorMessage('Could not start demo right now.');
      console.error('Demo start failed:', e?.response?.status, e?.response?.data || e);
    }
  };

  return { handleLogin, handleDemoStart, errorMessage };
}

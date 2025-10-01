// src/hooks/useLogin.ts
'use client';

import { useState } from 'react';
import { useUser } from '@bee/common';
import useBootstrapData from '@hooks/useBootstrapData';
import { apiUser, authHeaders } from '@utils/api';

type DemoOpts = {
  roles?: string[];
  preferredName?: string; // "First Last" optional
  lang?: 'en' | 'fr' | 'de' | 'br'; // <-- restrict to your backend choices
};

export function useLoginHandler() {
  const { login } = useUser();
  const { fetchBootstrapData } = useBootstrapData();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string, onSuccess: () => void) => {
    try {
      const response = await apiUser.post("/auth/login/", { username, password });
      const { access: token } = response.data;

      const userResponse = await apiUser.get("/users/me/", { headers: authHeaders(token) });
      const userInfo = userResponse.data;

      login(token, userInfo);
      await fetchBootstrapData(token, { force: true });
      onSuccess();
    } catch (e: any) {
      if (e?.response?.status === 401) setErrorMessage('Invalid username or password');
      else if (e?.response?.status === 403) setErrorMessage('Your account is not permitted to access this application.');
      else setErrorMessage('Connection error');
      console.error('Login failed:', e?.response?.status, e?.response?.data || e);
    }
  };

  // ⬇️ Accept preferredName (optional) and roles (optional)
const handleDemoStart = async (onSuccess: () => void, opts: DemoOpts = {}) => {
    try {
      const body: any = { roles: opts.roles ?? ['teacher'] };
      if (opts.preferredName?.trim()) body.preferred_name = opts.preferredName.trim();
      if (opts.lang) body.lang = opts.lang;                    // <-- send lang if provided

      const startResp = await apiUser.post('/auth/demo/start/', body, { withCredentials: true });
      const { access: token } = startResp.data;

      // Use users/me to get username, first_name, last_name, lang, roles...
      const meResp = await apiUser.get('/users/me/', { headers: authHeaders(token), withCredentials: true });
      const userInfo = meResp.data;

      login(token, userInfo);
      await fetchBootstrapData(token, { force: true });
      onSuccess();
    } catch (e: any) {
      setErrorMessage('Could not start demo right now.');
      console.error('Demo start failed:', e?.response?.status, e?.response?.data || e);
    }
  };

  return { handleLogin, handleDemoStart, errorMessage };

}

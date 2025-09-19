// src/hooks/useLogin.ts
'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useAuth } from '@context/AuthContext';
import useBootstrapData from '@hooks/useBootstrapData';
import { apiUser, authHeaders } from '@utils/api';


export function useLoginHandler() {
  const { login } = useAuth();
  const { fetchBootstrapData } = useBootstrapData();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
 

  const handleLogin = async (username: string, password: string, onSuccess: () => void) => {
    try { 


      console.warn('[useLoginHandler] handleLogin called');
      const response = await apiUser.post("/auth/login/",  { username, password });

      const { access: token } = response.data;

 

      const userResponse = await apiUser.get("/users/me/", { headers: authHeaders(token) });

      const userInfo = userResponse.data;
      console.log('[useLoginHandler] apiUser /users/me OK:', userInfo);


      login(token, userInfo);

      console.log('[useLoginHandler] calling fetchBootstrapData(token)');
      await fetchBootstrapData(token, { force: true });
      console.log('[useLoginHandler] fetchBootstrapData() finished');
 

      onSuccess();
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setErrorMessage('Invalid username or password');
      } else if (e?.response?.status === 403) {
        setErrorMessage('Your account is not permitted to access this application.');
      } else {
        setErrorMessage('Connection error');
      } 
      console.error('Login failed:', errorMessage);
    }
  };


  // 🔥 Demo start flow (JWT + cookie)
  const handleDemoStart = async (onSuccess: () => void) => {
    try {
      console.warn('[useLoginHandler] handleDemoStart called');

      // issue demo session; cookie set via withCredentials
      const startResp = await apiUser.post(
        '/auth/demo/start/',
        {},
        { withCredentials: true } // <-- critical to receive HttpOnly cookie
      );

      const { access: token } = startResp.data;

      // fetch user info from /me/ so we get { is_demo, demo_expires_at }
      const meResp = await apiUser.get('/me/', { headers: authHeaders(token), withCredentials: true });
      const userInfo = meResp.data;

      login(token, userInfo);
      await fetchBootstrapData(token, { force: true });

      onSuccess();
    } catch (e: any) {
      setErrorMessage('Could not start demo right now.');
      console.error('Demo start failed:', e);
    }
  };

  return { handleLogin, handleDemoStart, errorMessage };
}

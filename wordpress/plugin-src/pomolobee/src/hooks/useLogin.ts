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

  return { handleLogin, errorMessage };
}

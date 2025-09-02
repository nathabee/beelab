// src/hooks/useProtectedPage.ts
'use client';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '@utils/jwt';

export const useProtectedPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const token = getToken();  //token is null if expired
    console.log('[useProtectedPage] Current token:', token);
    if (  !token) {
      console.warn('[useProtectedPage] No valid token found → redirecting to login in pomolobee_login');
      navigate('/pomolobee_login');
    }
  }, [navigate, pathname]);
};

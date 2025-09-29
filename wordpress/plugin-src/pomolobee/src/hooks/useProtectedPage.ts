// src/hooks/useProtectedPage.ts
'use client';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { getToken } from '@utils/jwt';

import { useUser } from '@bee/common'; 
import { useApp } from '@context/AppContext';


export const useProtectedPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, token } = useUser();
  const { reset } = useApp();

  useEffect(() => {
    // const token = getToken();  //token is null if expired
    console.log('[useProtectedPage] Current token:', token);
    if (  !token) {
      logout();
      reset();
      console.warn('[useProtectedPage] No valid token found → redirecting to login in pomolobee_login');
      navigate('/login');
    }
  }, [navigate, pathname]);
};

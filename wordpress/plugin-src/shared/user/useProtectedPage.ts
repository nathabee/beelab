// shared/user/useProtectedPage.ts
'use client';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';  // already shared

// We don't import useApp here, to keep it plugin-agnostic.
// Each plugin can reset its AppContext manually if it needs to.
export const useProtectedPage = (onLogout?: () => void) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, token } = useUser();

  useEffect(() => {
    console.log('[useProtectedPage] Current token:', token);
    if (!token) {
      logout();
      if (onLogout) onLogout(); // let plugin reset its own context if desired
      console.warn('[useProtectedPage] No valid token → redirecting to /login');
      navigate('/login');
    }
  }, [navigate, pathname, token, logout, onLogout]);
};

// shared/user/jwt.ts
import { jwtDecode } from 'jwt-decode';
import { useEffect, useMemo } from 'react';
import { useUser } from './UserContext';

interface JwtPayload {
  exp: number;
  iat?: number;
  [key: string]: unknown;
}

export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const now = Date.now() / 1000;
    return !decoded.exp || decoded.exp < now;
  } catch (err) {
    console.error('Error decoding token:', err);
    return true;
  }
}

/**
 * Non-React, storage-based token reader (safe for utils/tests).
 * Returns a token *string* or null; does NOT inspect context nor clear anything.
 */
export function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('authToken');
  return t && !isTokenExpired(t) ? t : null;
}

/**
 * React-friendly selector that:
 *  - returns a valid token from context OR null
 *  - if expired, clears it from context (and storage via your provider)
 */
export function useValidToken(): string | null {
  const { token, setToken } = useUser();

  useEffect(() => {
    if (token && isTokenExpired(token)) {
      setToken(null); // this will flip isLoggedIn=false and purge storage (via AuthProvider)
    }
  }, [token, setToken]);

  return useMemo(() => {
    return token && !isTokenExpired(token) ? token : null;
  }, [token]);
}

// src/app/ErrorUserBootstrap.tsx
'use client';
import { useEffect } from 'react';
import { setErrorUserSupplier } from '@bee/common/error';
import { useAuth } from '@context/AuthContext';

export default function ErrorUserBootstrap() {
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    // Called on mount and whenever auth state changes.
    setErrorUserSupplier(() => {
      // Normalize roles to string[]
      const roles =
        (user as any)?.roles ??
        (user as any)?.capabilities ??
        (Array.isArray((user as any)?.role) ? (user as any).role : undefined);

      return {
        isLoggedIn: !!isLoggedIn,
        id: (user as any)?.id ?? (user as any)?.ID,
        username: (user as any)?.username || (user as any)?.name || (user as any)?.user_login,
        email: (user as any)?.email,
        roles: Array.isArray(roles) ? roles : roles ? Object.keys(roles) : [],
      };
    });
  }, [isLoggedIn, user]);

  return null;
}

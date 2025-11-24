// shared/user/hooks/useUserProfile.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { useUser } from '../UserContext';
import { authHeaders } from '../http';
import { normalizeLang, type LangCode } from '../lang';

export function useUserProfile(apiUser?: AxiosInstance) {
  const userCtx: any = useUser();
  const { user, token } = userCtx || {};

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [lang, setLang] = useState<LangCode>('en');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // seed from context for instant paint
  useEffect(() => {
    if (user) {
      setUsername(String(user.username ?? ''));
      setFirstName(String(user.first_name ?? ''));
      setLastName(String(user.last_name ?? ''));
      setLang(normalizeLang(user.lang));
      setLoading(false);
    }
  }, [user]);

  const reload = useCallback(async () => {
    if (!apiUser || !token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiUser.get('/users/me/', { headers: authHeaders(token) });
      const u = resp.data || {};
      setUsername(String(u.username ?? ''));
      setFirstName(String(u.first_name ?? ''));
      setLastName(String(u.last_name ?? ''));
      setLang(normalizeLang(u.lang));
    } catch (e: any) {
      setError('Unable to load your profile.');
      // eslint-disable-next-line no-console
      console.error('useUserProfile: GET /users/me/ failed', e?.response?.status, e?.response?.data || e);
    } finally {
      setLoading(false);
    }
  }, [apiUser, token]);

  // refresh from server after initial seed
  useEffect(() => {
    reload();
  }, [reload]);

  const dirty = useMemo(() => {
    if (!user) return true;
    const ctxLang = normalizeLang(user.lang);
    return (
      String(user.first_name ?? '') !== firstName ||
      String(user.last_name ?? '') !== lastName ||
      ctxLang !== lang
    );
  }, [user, firstName, lastName, lang]);

  const save = useCallback(async () => {
    if (!apiUser || !token) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const body = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        lang,
      };
      await apiUser.patch('/users/me/', body, { headers: authHeaders(token) });

      // fetch canonical server state
      const meResp = await apiUser.get('/users/me/', { headers: authHeaders(token) });
      const freshUser = meResp.data;

      // push into context if possible
      if (userCtx?.setUser) userCtx.setUser(freshUser);
      else if (userCtx?.login) userCtx.login(token, freshUser);

      setFirstName(String(freshUser.first_name ?? ''));
      setLastName(String(freshUser.last_name ?? ''));
      setLang(normalizeLang(freshUser.lang));

      setSaved(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 400) setError('Please check your inputs.');
      else if (status === 401) setError('You are not authenticated.');
      else setError('Could not save your profile right now.');
      // eslint-disable-next-line no-console
      console.error('useUserProfile: save failed', status, e?.response?.data || e);
    } finally {
      setSaving(false);
    }
  }, [apiUser, token, firstName, lastName, lang, userCtx]);

  const reset = useCallback(async () => {
    setSaved(false);
    setError(null);
    await reload();
  }, [reload]);

  return {
    // state
    username, firstName, lastName, lang,
    setFirstName, setLastName, setLang,
    loading, saving, saved, error, dirty,
    // actions
    save, reset, reload,
  };
}

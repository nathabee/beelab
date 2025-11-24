'use client';

import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { apiApp, authHeaders } from '@utils/api';

import type { InfoResponse, InfoMe } from '@mytypes/info';

type BootstrapOpts = { force?: boolean };

export default function useBootstrapData() {
  const { info, setInfo, setMe } = useApp();
  const { token } = useUser();

  /**
   * Bootstrap: load public /info/ data.
   * No auth, can be called on plugin init.
   */
  const fetchBootstrapData = async (opts: BootstrapOpts = {}) => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[bootstrap] fetchBootstrapData @', time);

    try {
      if (opts.force || !info) {
        const response = await apiApp.get<InfoResponse>('/info/');
        setInfo(response.data);
      }
    } catch (error) {
      console.error('[bootstrap] Error fetching /info/:', error);
      throw error;
    }
  };

  /**
   * Protected /me/ call.
   * Use it for a "Who am I?" button in the Nutshell plugin.
   */
  const fetchMe = async (tokenParam?: string) => {
    const t = tokenParam ?? token;
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[bootstrap] fetchMe @', time);

    if (!t) {
      console.warn('[bootstrap] fetchMe: no token, bail');
      setMe(null);
      return;
    }

    const headers = authHeaders(t);

    try {
      const response = await apiApp.get<InfoMe>('/me/', { headers });
      setMe(response.data);
    } catch (error) {
      console.error('[bootstrap] Error fetching /me/:', error);
      throw error;
    }
  };

  return { fetchBootstrapData, fetchMe };
}

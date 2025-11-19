// src/hooks/useBootstrapData.ts
//
// Minimal bootstrap hook for the Nutshell template.
// This is intentionally simple: it just tries to call /me/ on the UserCore API
// to verify that auth / routing are working. The structure is kept generic
// so it can be adapted per project.

import { useEffect, useState } from 'react';
import { apiUser } from '@utils/api';

export type NutshellBootstrapState = {
  loading: boolean;
  error: string | null;
  data: any;
};

const useBootstrapData = (): NutshellBootstrapState => {
  const [state, setState] = useState<NutshellBootstrapState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await apiUser.get('/me/');
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          data: res.data,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error: 'bootstrap-failed',
          data: null,
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

export default useBootstrapData;

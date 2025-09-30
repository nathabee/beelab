'use client';

import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { apiApp, authHeaders } from '@utils/api';
import { ScoreRulePoint } from '@mytypes/report';

type BootstrapOpts = { force?: boolean };

export default function useBootstrapData() {
  const {
    catalogue, setCatalogue,
    layouts, setLayouts,
    niveaux, setNiveaux,
    scoreRulePoints, setScoreRulePoints,
  } = useApp();

  const { token } = useUser();

  const fetchBootstrapData = async (tokenParam?: string, opts: BootstrapOpts = {}) => {
    const t = tokenParam ?? token;
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[bootstrap] fetchBootstrapData @', time);

    if (!t) { console.warn('[bootstrap] no token, bail'); return; }
    const headers = authHeaders(t);

    try {
      if (opts.force || ((catalogue?.length ?? 0) === 0)) {
        const response = await apiApp.get('/catalogues/', { headers });
        setCatalogue(response.data);
      }

      if (opts.force || ((layouts?.length ?? 0) === 0)) {
        const layoutsResponse = await apiApp.get('/pdf_layouts/', { headers });
        setLayouts(layoutsResponse.data);
      }

      if (opts.force || ((niveaux?.length ?? 0) === 0)) {
        const niveauResponse = await apiApp.get('/niveaux/', { headers });
        setNiveaux(niveauResponse.data);
      }

      if (opts.force || ((scoreRulePoints?.length ?? 0) === 0)) {
        const scoreRuleResponse = await apiApp.get<ScoreRulePoint[]>('/scorerulepoints/', { headers });
        setScoreRulePoints(scoreRuleResponse.data);
      }
    } catch (error) {
      console.error('[bootstrap] Error fetching data:', error);
      throw error; // surface to caller if needed
    }
  };

  return { fetchBootstrapData };
}

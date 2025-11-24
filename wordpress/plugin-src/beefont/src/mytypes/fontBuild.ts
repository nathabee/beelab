// src/hooks/useFontBuild.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import { useApp } from '@context/AppContext';

import type { FontBuild } from '@mytypes/fontBuild';
import type { BuildRequestPayload } from '@mytypes/fontBuild';

export type UseFontBuildOptions = {
  /**
   * If true, the hook will NOT auto-fetch build history on mount.
   * You can then call fetchBuilds() manually.
   *
   * Default = true (i.e. NO auto-call).
   */
  manual?: boolean;
};

export type UseFontBuildResult = {
  builds: FontBuild[];
  isLoadingBuilds: boolean;
  isBuilding: boolean;
  error: AppError | null;

  /**
   * Fetch build history for this job.
   * Only call this in places where you actually want to list builds.
   */
  fetchBuilds: () => Promise<void>;

  /**
   * Build a font for the given language code.
   * Returns the created/updated FontBuild object (if the backend returns one).
   */
  buildLanguage: (languageCode: string) => Promise<FontBuild | null>;

  /**
   * Helper to construct the TTF download URL for a given language.
   */
  getTtfDownloadUrl: (languageCode: string) => string;

  /**
   * Helper to construct the ZIP download URL for all fonts for this job.
   */
  getZipDownloadUrl: () => string;
};

export default function useFontBuild(
  sidParam: string,
  options: UseFontBuildOptions = {},
): UseFontBuildResult {
  // IMPORTANT: default is manual = true → no auto-fetch
  const { manual = true } = options;

  const { token } = useUser();
  const { activeJob } = useApp();

  // Resolve effective SID: URL param wins, else activeJob.sid
  const sid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  const [builds, setBuilds] = useState<FontBuild[]>([]);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  // Debug: where did the SID come from?
  useEffect(() => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.debug('[beefont/useFontBuild] SID resolution @', time, {
      sidParam,
      activeJobSid: activeJob?.sid ?? null,
      effectiveSid: sid,
    });
  }, [sidParam, activeJob, sid]);

  const fetchBuilds = useCallback(async (): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[beefont/useFontBuild] fetchBuilds @', time, 'sid=', sid);

    if (!sid) {
      const err = toAppError(new Error('No job SID provided'), {
        component: 'useFontBuild',
        functionName: 'fetchBuilds',
        service: 'beefont',
      });
      setError(err);
      setBuilds([]);
      return Promise.reject(err);
    }

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'useFontBuild',
        functionName: 'fetchBuilds',
        service: 'beefont',
      });
      if (err.httpStatus === 401 || err.httpStatus === 403) {
        err.severity = 'page';
        errorBus.emit(err);
      }
      setError(err);
      setBuilds([]);
      return Promise.reject(err);
    }

    setIsLoadingBuilds(true);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);

    // NOTE: this endpoint must exist in your backend;
    // if it does not, this function will 404 – but ONLY
    // when you explicitly call it from a “build list” component.
    const url = `/jobs/${encodedSid}/builds/`;

    try {
      const res = await apiApp.get<FontBuild[]>(url, { headers });
      setBuilds(res.data);
      setIsLoadingBuilds(false);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'useFontBuild',
        functionName: 'fetchBuilds',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      setBuilds([]);
      setIsLoadingBuilds(false);
      return Promise.reject(appErr);
    }
  }, [sid, token]);

  const buildLanguage = useCallback(
    async (languageCode: string): Promise<FontBuild | null> => {
      const trimmed = languageCode.trim();
      console.log(
        '[beefont/useFontBuild] buildLanguage sid=',
        sid,
        'language=',
        trimmed,
      );

      if (!sid) {
        const err = toAppError(new Error('No job SID provided'), {
          component: 'useFontBuild',
          functionName: 'buildLanguage',
          service: 'beefont',
        });
        setError(err);
        return Promise.reject(err);
      }

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useFontBuild',
          functionName: 'buildLanguage',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        setError(err);
        return Promise.reject(err);
      }

      setIsBuilding(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const url = `/jobs/${encodedSid}/build-ttf/`;

      const payload: BuildRequestPayload = { language: trimmed };

      try {
        const res = await apiApp.post<FontBuild>(url, payload, { headers });
        const build = res.data;

        // Merge into local history, replacing same id if present.
        setBuilds(prev => {
          const idx = prev.findIndex(b => b.id === build.id);
          if (idx === -1) return [...prev, build];
          const next = [...prev];
          next[idx] = build;
          return next;
        });

        setIsBuilding(false);
        return build;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useFontBuild',
          functionName: 'buildLanguage',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsBuilding(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token],
  );

  const getTtfDownloadUrl = useCallback(
    (languageCode: string): string => {
      if (!sid) return '';
      const encodedSid = encodeURIComponent(sid);
      const encodedLang = encodeURIComponent(languageCode.trim());
      return `/jobs/${encodedSid}/download/ttf/${encodedLang}/`;
    },
    [sid],
  );

  const getZipDownloadUrl = useCallback((): string => {
    if (!sid) return '';
    const encodedSid = encodeURIComponent(sid);
    return `/jobs/${encodedSid}/download/zip/`;
  }, [sid]);

  // Auto-load build history ONLY if *explicitly* requested.
  useEffect(() => {
    if (manual) {
      console.debug('[beefont/useFontBuild] manual mode, no auto fetch');
      return;
    }
    if (!sid) {
      console.warn('[beefont/useFontBuild] no SID, skipping initial fetch');
      return;
    }
    fetchBuilds().catch(err => {
      console.error('[beefont/useFontBuild] initial fetch failed:', err);
    });
  }, [manual, sid, fetchBuilds]);

  return {
    builds,
    isLoadingBuilds,
    isBuilding,
    error,
    fetchBuilds,
    buildLanguage,
    getTtfDownloadUrl,
    getZipDownloadUrl,
  };
}

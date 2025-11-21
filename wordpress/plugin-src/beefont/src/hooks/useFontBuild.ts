'use client';

// src/hooks/useFontBuild.ts

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import type { FontBuild } from '@mytypes/fontBuild';
import type { BuildRequestPayload } from '@mytypes/fontBuild';

export type UseFontBuildOptions = {
  /**
   * If true, the hook will NOT auto-fetch build history on mount.
   * You can then call fetchBuilds() manually.
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
   * Adjust the URL if your backend exposes a different endpoint.
   */
  fetchBuilds: () => Promise<void>;

  /**
   * Build a font for the given language code.
   * Returns the created/updated FontBuild object (if the backend returns one).
   */
  buildLanguage: (languageCode: string) => Promise<FontBuild | null>;

  /**
   * Helper to construct the TTF download URL for a given language.
   * You can use it directly in an <a href="..."> link.
   */
  getTtfDownloadUrl: (languageCode: string) => string;

  /**
   * Helper to construct the ZIP download URL for all fonts for this job.
   */
  getZipDownloadUrl: () => string;
};

export default function useFontBuild(
  sid: string,
  options: UseFontBuildOptions = {},
): UseFontBuildResult {
  const { manual = false } = options;
  const { token } = useUser();

  const [builds, setBuilds] = useState<FontBuild[]>([]);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const fetchBuilds = useCallback(async (): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[beefont/useFontBuild] fetchBuilds @', time, 'sid=', sid);

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

    // Adjust this path if your backend exposes build history elsewhere.
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
        // Missing glyphs or validation errors → normal inline error,
        // but auth problems should be elevated to page severity.
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
      const encodedSid = encodeURIComponent(sid);
      const encodedLang = encodeURIComponent(languageCode.trim());
      return `/jobs/${encodedSid}/download/ttf/${encodedLang}/`;
    },
    [sid],
  );

  const getZipDownloadUrl = useCallback((): string => {
    const encodedSid = encodeURIComponent(sid);
    return `/jobs/${encodedSid}/download/zip/`;
  }, [sid]);

  // Auto-load build history unless manual mode is enabled.
  useEffect(() => {
    if (manual) return;
    fetchBuilds().catch(err => {
      console.error('[beefont/useFontBuild] initial fetch failed:', err);
    });
  }, [manual, fetchBuilds]);

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

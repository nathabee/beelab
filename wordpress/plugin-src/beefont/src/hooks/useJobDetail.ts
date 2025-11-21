'use client';

// src/hooks/useJobDetail.ts

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, AppError } from '@bee/common/error';

import type { FontJob } from '@mytypes/fontJob';
import type { JobPage } from '@mytypes/jobPage';
import type { LanguageStatus } from '@mytypes/languageStatus';

export type UseJobDetailResult = {
  job: FontJob | null;
  pages: JobPage[];
  languageStatuses: LanguageStatus[];

  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;

  /**
   * Reloads job, language status and pages in one shot.
   */
  reload: () => Promise<void>;
};

export default function useJobDetail(sid: string): UseJobDetailResult {
  const { token } = useUser();

  const [job, setJob] = useState<FontJob | null>(null);
  const [pages, setPages] = useState<JobPage[]>([]);
  const [languageStatuses, setLanguageStatuses] = useState<LanguageStatus[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  // Tracks whether we have ever successfully loaded once
  const hasLoadedRef = useRef(false);

  const reload = useCallback(async (): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[beefont/useJobDetail] reload @', time, 'sid=', sid);

    if (!token) {
      console.warn('[beefont/useJobDetail] reload: no token');
      const appErr: AppError = {
        name: 'AuthError',
        message: 'No auth token available.',
        httpStatus: 401,
        severity: 'page',
        service: 'beefont',
        raw: null,
      };
      setError(appErr);
      errorBus.emit(appErr);
      return Promise.reject(appErr);
    }

    // First call: show "isLoading"
    // Later calls: show "isRefreshing"
    const isFirstLoad = !hasLoadedRef.current;
    setIsLoading(isFirstLoad);
    setIsRefreshing(!isFirstLoad);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);

    try {
      const [jobRes, langRes, pagesRes] = await Promise.all([
        apiApp.get<FontJob>(`/jobs/${encodedSid}/`, { headers }),
        apiApp.get<LanguageStatus[]>(`/jobs/${encodedSid}/languages/status/`, {
          headers,
        }),
        apiApp.get<JobPage[]>(`/jobs/${encodedSid}/pages/`, { headers }),
      ]);

      setJob(jobRes.data);
      setLanguageStatuses(langRes.data);
      setPages(pagesRes.data);

      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        functionName: 'useJobDetail.reload',
        service: 'beefont',
      });

      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }

      setError(appErr);
      setIsLoading(false);
      setIsRefreshing(false);

      // Keep stale state, but bubble error up
      return Promise.reject(appErr);
    }
  }, [sid, token]);  // <— job removed here

  // Auto-load whenever sid changes
  useEffect(() => {
    if (!sid) return;
    reload().catch(err => {
      console.error('[beefont/useJobDetail] initial load failed:', err);
    });
  }, [sid, reload]);

  return {
    job,
    pages,
    languageStatuses,
    isLoading,
    isRefreshing,
    error,
    reload,
  };
}

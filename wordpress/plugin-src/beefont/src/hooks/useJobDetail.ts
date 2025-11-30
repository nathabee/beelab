// src/hooks/useJobDetail.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, AppError } from '@bee/common/error';

import type { FontJob } from '@mytypes/fontJob';
import type { JobPage } from '@mytypes/jobPage';
import type { LanguageStatus } from '@mytypes/languageStatus';
import { useApp } from '@context/AppContext'; 
import { DEFAULT_GLYPH_FORMAT } from '@mytypes/glyph';

export type UseJobDetailResult = {
  job: FontJob | null;
  pages: JobPage[];
  languageStatuses: LanguageStatus[];

  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;

  reload: () => Promise<void>;
  updateJobMeta: (args: {
    name?: string;
    base_family?: string | null;
  }) => Promise<FontJob>;
};

export default function useJobDetail(sid: string): UseJobDetailResult {
  const { token } = useUser();
  const { activeGlyphFormat } = useApp(); // 'png' | 'svg'

  const [job, setJob] = useState<FontJob | null>(null);
  const [pages, setPages] = useState<JobPage[]>([]);
  const [languageStatuses, setLanguageStatuses] = useState<LanguageStatus[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const hasLoadedRef = useRef(false);

  const emitError = (base: Error, meta: { functionName: string }) => {
    const appErr = toAppError(base, {
      component: 'useJobDetail',
      service: 'beefont',
      functionName: meta.functionName,
    });
    setError(appErr);
    if (appErr.httpStatus === 401 || appErr.httpStatus === 403 || appErr.severity === 'page') {
      errorBus.emit(appErr);
    }
    return appErr;
  };

  const reload = useCallback(async (): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log(
      '[beefont/useJobDetail] reload @',
      time,
      'sid=',
      sid,
      'format=',
      activeGlyphFormat,
    );

    if (!token) {
      const err = emitError(
        new Error('No auth token available (useJobDetail.reload)'),
        { functionName: 'reload' },
      );
      return Promise.reject(err);
    }

    if (!sid) {
      const err = emitError(
        new Error('No job SID provided (useJobDetail.reload)'),
        { functionName: 'reload' },
      );
      return Promise.reject(err);
    }

    const isFirstLoad = !hasLoadedRef.current;
    setIsLoading(isFirstLoad);
    setIsRefreshing(!isFirstLoad);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);
    const format = activeGlyphFormat || DEFAULT_GLYPH_FORMAT ;
    const encodedFormat = encodeURIComponent(format);

    try {
      const [jobRes, langRes, pagesRes] = await Promise.all([
        apiApp.get<FontJob>(`/jobs/${encodedSid}/`, { headers }),
        apiApp.get<LanguageStatus[]>(
          `/jobs/${encodedSid}/missingcharstatus/${encodedFormat}/`,
          { headers },
        ),
        apiApp.get<JobPage[]>(`/jobs/${encodedSid}/pages/`, { headers }),
      ]);

      setJob(jobRes.data);
      setLanguageStatuses(langRes.data);
      setPages(pagesRes.data);

      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (e: any) {
      const appErr = toAppError(e, {
        component: 'useJobDetail',
        functionName: 'reload',
        service: 'beefont',
      });

      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = appErr.severity ?? 'page';
        errorBus.emit(appErr);
      }

      setError(appErr);
      setIsLoading(false);
      setIsRefreshing(false);
      return Promise.reject(appErr);
    }
  }, [sid, token, activeGlyphFormat]);

  const updateJobMeta = useCallback(
    async (args: { name?: string; base_family?: string | null }): Promise<FontJob> => {
      if (!token) {
        const err = emitError(
          new Error('No auth token available (useJobDetail.updateJobMeta)'), 
          { functionName: 'updateJobMeta' },
        );
        return Promise.reject(err);
      }

      const payload: any = {};

      if (typeof args.name === 'string') {
        const trimmed = args.name.trim();
        if (!trimmed) {
          const err = emitError(
            new Error('Job name may not be empty (useJobDetail.updateJobMeta)'),
            { functionName: 'updateJobMeta' },
          );
          return Promise.reject(err);
        }
        payload.name = trimmed;
      }

      if (args.base_family !== undefined) {
        const bf = args.base_family?.trim() || '';
        payload.base_family = bf || null;
      }

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);

      try {
        setIsRefreshing(true);
        const res = await apiApp.patch<FontJob>(
          `/jobs/${encodedSid}/`,
          payload,
          { headers },
        );
        setJob(res.data);
        setIsRefreshing(false);
        return res.data;
      } catch (e: any) {
        const appErr = toAppError(e, {
          component: 'useJobDetail',
          functionName: 'updateJobMeta',
          service: 'beefont',
        });
        setError(appErr);
        setIsRefreshing(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token],
  );

  useEffect(() => {
    if (!sid || !token) return;
    reload().catch(err => {
      console.error('[beefont/useJobDetail] initial load failed:', err);
    });
  }, [sid, token, activeGlyphFormat, reload]);

  return {
    job,
    pages,
    languageStatuses,
    isLoading,
    isRefreshing,
    error,
    reload,
    updateJobMeta,
  };
}

'use client';

// src/hooks/usePages.ts

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import type { JobPage } from '@mytypes/jobPage';

export type UsePagesOptions = {
  /**
   * If true, the hook will NOT auto-fetch on mount.
   * You can then call fetchPages() manually.
   */
  manual?: boolean;
};

export type UploadPageArgs = {
  /**
   * Template code used by the backend (TemplateDefinition.code)
   */
  template_code: string;

  /**
   * String of letters assigned to this page, in the order
   * that the template expects (e.g. "ABCDEF...").
   */
  letters: string;

  /**
   * Optional explicit page_index. If omitted, backend may assign one.
   */
  page_index?: number | null;

  /**
   * The scanned page file (image, PDF, etc. depending on backend).
   */
  file: File;

  /**
   * Whether the backend should auto-run analysis after upload.
   * (Your spec: auto_analyse=true)
   */
  auto_analyse?: boolean;
};

export type UsePagesResult = {
  pages: JobPage[];
  isLoading: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  isAnalysing: boolean;
  error: AppError | null;

  fetchPages: () => Promise<void>;
  uploadPage: (args: UploadPageArgs) => Promise<JobPage>;
  retryAnalysis: (pageId: number) => Promise<JobPage>;
  deletePage: (pageId: number) => Promise<void>;
};

export default function usePages(
  sid: string,
  options: UsePagesOptions = {},
): UsePagesResult {
  const { manual = false } = options;
  const { token } = useUser();

  const [pages, setPages] = useState<JobPage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isAnalysing, setIsAnalysing] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const fetchPages = useCallback(async (): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[beefont/usePages] fetchPages @', time, 'sid=', sid);

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'usePages',
        functionName: 'fetchPages',
        service: 'beefont',
      });
      if (err.httpStatus === 401 || err.httpStatus === 403) {
        err.severity = 'page';
        errorBus.emit(err);
      }
      setError(err);
      setPages([]);
      return Promise.reject(err);
    }

    setIsLoading(true);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);

    try {
      const res = await apiApp.get<JobPage[]>(`/jobs/${encodedSid}/pages/`, {
        headers,
      });
      setPages(res.data);
      setIsLoading(false);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'usePages',
        functionName: 'fetchPages',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      setPages([]);
      setIsLoading(false);
      return Promise.reject(appErr);
    }
  }, [sid, token]);

  const uploadPage = useCallback(
    async (args: UploadPageArgs): Promise<JobPage> => {
      const { template_code, letters, page_index, file, auto_analyse = true } =
        args;

      console.log('[beefont/usePages] uploadPage sid=', sid, 'tpl=', template_code);

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'usePages',
          functionName: 'uploadPage',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        return Promise.reject(err);
      }

      setIsUploading(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);

      const form = new FormData();
      form.append('template_code', template_code);
      form.append('letters', letters);
      if (page_index !== undefined) {
        form.append('page_index', String(page_index));
      }
      form.append('file', file, file.name);
      form.append('auto_analyse', auto_analyse ? 'true' : 'false');

      try {
        const res = await apiApp.post<JobPage>(
          `/jobs/${encodedSid}/pages/create/`,
          form,
          {
            headers,
          },
        );

        const created = res.data;
        setPages(prev => [...prev, created]);
        setIsUploading(false);
        return created;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'usePages',
          functionName: 'uploadPage',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsUploading(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token],
  );

  const retryAnalysis = useCallback(
    async (pageId: number): Promise<JobPage> => {
      console.log('[beefont/usePages] retryAnalysis sid=', sid, 'pageId=', pageId);

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'usePages',
          functionName: 'retryAnalysis',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        return Promise.reject(err);
      }

      setIsAnalysing(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const url = `/jobs/${encodedSid}/pages/${pageId}/retry-analysis/`;

      try {
        const res = await apiApp.post<JobPage>(url, null, { headers });
        const updated = res.data;

        // Update that page in local state
        setPages(prev =>
          prev.map(p => (p.id === pageId ? updated : p)),
        );

        setIsAnalysing(false);
        return updated;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'usePages',
          functionName: 'retryAnalysis',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsAnalysing(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token],
  );

  const deletePage = useCallback(
    async (pageId: number): Promise<void> => {
      console.log('[beefont/usePages] deletePage sid=', sid, 'pageId=', pageId);

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'usePages',
          functionName: 'deletePage',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        return Promise.reject(err);
      }

      setIsDeleting(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const url = `/jobs/${encodedSid}/pages/${pageId}/`;

      try {
        await apiApp.delete(url, { headers });
        setPages(prev => prev.filter(p => p.id !== pageId));
        setIsDeleting(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'usePages',
          functionName: 'deletePage',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsDeleting(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token],
  );

  // Auto-load on mount / sid change unless manual mode is set.
  useEffect(() => {
    if (manual) return;
    fetchPages().catch(err => {
      console.error('[beefont/usePages] initial fetch failed:', err);
    });
  }, [manual, fetchPages]);

  return {
    pages,
    isLoading,
    isUploading,
    isDeleting,
    isAnalysing,
    error,
    fetchPages,
    uploadPage,
    retryAnalysis,
    deletePage,
  };
}

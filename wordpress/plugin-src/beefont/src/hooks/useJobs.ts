// src/hooks/useJobs.ts

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, AppError } from '@bee/common/error';

import type { FontJob } from '@mytypes/fontJob';

export type UseJobsOptions = {
  manual?: boolean;
};

export type UseJobsResult = {
  jobs: FontJob[];
  isLoading: boolean;
  isDeleting: boolean;
  error: AppError | null;

  fetchJobs: (opts?: { force?: boolean }) => Promise<void>;
  deleteJob: (sid: string) => Promise<void>;

  // NEU: Job anlegen
  createJob: (payload: { name: string; base_family?: string }) => Promise<FontJob>;
};

export default function useJobs(options: UseJobsOptions = {}): UseJobsResult {
  const { manual = false } = options;

  const { token } = useUser();

  const [jobs, setJobs] = useState<FontJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const authMissingError = (): AppError => ({
    name: 'AuthError',
    message: 'No auth token available.',
    httpStatus: 401,
    severity: 'page',
    service: 'beefont',
    raw: null,
  });

  const fetchJobs = useCallback(
    async (opts?: { force?: boolean }): Promise<void> => {
      const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
      console.log('[beefont/useJobs] fetchJobs @', time, 'opts=', opts);

      if (!token) {
        console.warn('[beefont/useJobs] fetchJobs: no token');
        const appErr = authMissingError();
        setError(appErr);
        errorBus.emit(appErr);
        return Promise.reject(appErr);
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await apiApp.get<FontJob[]>('/jobs/', {
          headers: authHeaders(token),
        });
        setJobs(res.data);
        setIsLoading(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          functionName: 'useJobs.fetchJobs',
          service: 'beefont',
        });

        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }

        setError(appErr);
        setJobs([]);
        setIsLoading(false);
        return Promise.reject(appErr);
      }
    },
    [token],
  );

  const deleteJob = useCallback(
    async (sid: string): Promise<void> => {
      if (!token) {
        console.warn('[beefont/useJobs] deleteJob: no token');
        const appErr = authMissingError();
        errorBus.emit(appErr);
        return Promise.reject(appErr);
      }

      console.log('[beefont/useJobs] deleteJob sid=', sid);

      setIsDeleting(true);

      try {
        await apiApp.delete(`/jobs/${encodeURIComponent(sid)}/`, {
          headers: authHeaders(token),
        });

        setJobs(prev => prev.filter(job => job.sid !== sid));
        setIsDeleting(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          functionName: 'useJobs.deleteJob',
          service: 'beefont',
        });

        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }

        setIsDeleting(false);
        return Promise.reject(appErr);
      }
    },
    [token],
  );

  // NEU: Job anlegen
  const createJob = useCallback(
    async (payload: { name: string; base_family?: string }): Promise<FontJob> => {
      if (!token) {
        console.warn('[beefont/useJobs] createJob: no token');
        const appErr = authMissingError();
        errorBus.emit(appErr);
        return Promise.reject(appErr);
      }

      const body = {
        name: payload.name,
        base_family: payload.base_family ?? payload.name,
      };

      console.log('[beefont/useJobs] createJob body=', body);

      try {
        const res = await apiApp.post<FontJob>('/jobs/', body, {
          headers: authHeaders(token),
        });
        const job = res.data;

        // lokal in die Liste hängen
        setJobs(prev => [...prev, job]);

        return job;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          functionName: 'useJobs.createJob',
          service: 'beefont',
        });

        // Create-Fehler → eher Toast als "Seite kaputt"
        if (
          appErr.httpStatus === 401 ||
          appErr.httpStatus === 403 ||
          appErr.httpStatus === 500
        ) {
          appErr.severity = 'toast';
        }

        errorBus.emit(appErr);
        return Promise.reject(appErr);
      }
    },
    [token],
  );

  useEffect(() => {
    if (manual) return;
    fetchJobs().catch(err => {
      console.error('[beefont/useJobs] initial fetch failed:', err);
    });
  }, [fetchJobs, manual]);

  return {
    jobs,
    isLoading,
    isDeleting,
    error,
    fetchJobs,
    deleteJob,
    createJob, // NEU
  };
}

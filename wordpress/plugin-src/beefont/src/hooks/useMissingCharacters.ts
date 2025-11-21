'use client';

// src/hooks/useMissingCharacters.ts

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import type { LanguageStatus } from '@mytypes/languageStatus';

export type UseMissingCharactersOptions = {
  manual?: boolean;
};

export type UseMissingCharactersResult = {
  status: LanguageStatus | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  fetchStatus: () => Promise<LanguageStatus | null>;
};

export default function useMissingCharacters(
  sid: string,
  languageCode: string,
  options: UseMissingCharactersOptions = {},
): UseMissingCharactersResult {
  const { manual = false } = options;
  const { token } = useUser();

  const [status, setStatus] = useState<LanguageStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const fetchStatus = useCallback(async (): Promise<LanguageStatus | null> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log(
      '[beefont/useMissingCharacters] fetchStatus @',
      time,
      'sid=',
      sid,
      'language=',
      languageCode,
    );

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'useMissingCharacters',
        functionName: 'fetchStatus',
        service: 'beefont',
      });
      if (err.httpStatus === 401 || err.httpStatus === 403) {
        err.severity = 'page';
        errorBus.emit(err);
      }
      setError(err);
      setStatus(null);
      return Promise.reject(err);
    }

    if (!sid || !languageCode) {
      console.warn(
        '[beefont/useMissingCharacters] fetchStatus called without sid or language',
      );
      return Promise.resolve(null);
    }

    // First call → isLoading; later calls → isRefreshing if we already have data
    setIsLoading(prev => prev || status === null);
    setIsRefreshing(prev => prev || status !== null);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);
    const encodedLang = encodeURIComponent(languageCode);

    const url = `/jobs/${encodedSid}/languages/${encodedLang}/status/`;

    try {
      const res = await apiApp.get<LanguageStatus>(url, { headers });
      setStatus(res.data);
      setIsLoading(false);
      setIsRefreshing(false);
      return res.data;
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'useMissingCharacters',
        functionName: 'fetchStatus',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      setIsLoading(false);
      setIsRefreshing(false);
      return Promise.reject(appErr);
    } 
  }, [sid, languageCode, token]); 

  useEffect(() => {
    if (manual) return;
    if (!sid || !languageCode) return;
    if (!token) return;

    fetchStatus().catch(err => {
      console.error(
        '[beefont/useMissingCharacters] initial fetch failed:',
        err,
      );
    });
  }, [manual, sid, languageCode, token, fetchStatus]);

  return {
    status,
    isLoading,
    isRefreshing,
    error,
    fetchStatus,
  };
}

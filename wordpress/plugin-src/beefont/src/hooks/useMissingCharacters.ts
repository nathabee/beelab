// src/hooks/useMissingCharacters.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import type { LanguageStatus } from '@mytypes/languageStatus'; 
import { DEFAULT_GLYPH_FORMAT,GlyphFormat } from '@mytypes/glyph';

export type UseMissingCharactersOptions = {
  manual?: boolean;
  format?: GlyphFormat; // 'png' or 'svg'
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
  const { manual = false, format: overrideFormat } = options;
  const { token } = useUser();

  // Resolve effective format:
  // 1) explicit override from options
  // 2) global DEFAULT_GLYPH_FORMAT ('svg')
  const format: GlyphFormat = overrideFormat ?? DEFAULT_GLYPH_FORMAT;

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
      'format=',
      format,
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

    setIsLoading(prev => prev || status === null);
    setIsRefreshing(prev => prev || status !== null);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);
    const encodedLang = encodeURIComponent(languageCode);

    // backend route: /jobs/<sid>/missingcharstatus/<language>/<format>/
    const url = `/jobs/${encodedSid}/missingcharstatus/${encodedLang}/${format}/`;

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
  }, [sid, languageCode, format, token, status]);

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
  }, [manual, sid, languageCode, format, token, fetchStatus]);

  return {
    status,
    isLoading,
    isRefreshing,
    error,
    fetchStatus,
  };
}

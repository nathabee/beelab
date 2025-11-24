// src/hooks/useTemplateAlphabet.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUser } from '@bee/common';
import { apiApp, authHeaders } from '@utils/api';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import type { SupportedLanguageAlphabet } from '@mytypes/language';

export type UseTemplateAlphabetResult = {
  alphabet: string;
  isLoading: boolean;
  error: AppError | null;
  fetchAlphabet: (languageCode: string) => Promise<string | null>;
};

export default function useTemplateAlphabet(
  languageCode: string,
): UseTemplateAlphabetResult {
  const { token } = useUser();

  const [alphabet, setAlphabet] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const fetchAlphabet = useCallback(
    async (lang: string): Promise<string | null> => {
      if (!lang) {
        setAlphabet('');
        setError(null);
        return null;
      }

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useTemplateAlphabet',
          functionName: 'fetchAlphabet',
          service: 'beefont',
        });
        err.severity = 'page';
        errorBus.emit(err);
        setError(err);
        setAlphabet('');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const headers = authHeaders(token);
        const encoded = encodeURIComponent(lang);
        const url = `/languages/${encoded}/alphabet/`;

        const res = await apiApp.get<SupportedLanguageAlphabet>(url, { headers });
        const alphaStr = res.data.alphabet || '';
        setAlphabet(alphaStr);
        return alphaStr;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useTemplateAlphabet',
          functionName: 'fetchAlphabet',
          service: 'beefont',
        });

        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }

        setError(appErr);
        setAlphabet('');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!languageCode) {
      setAlphabet('');
      setError(null);
      return;
    }

    void fetchAlphabet(languageCode);
  }, [languageCode, fetchAlphabet]);

  return {
    alphabet,
    isLoading,
    error,
    fetchAlphabet,
  };
}

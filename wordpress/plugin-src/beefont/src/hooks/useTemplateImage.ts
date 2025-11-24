// src/hooks/useTemplateImage.ts
'use client';

import { useCallback, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

export type TemplateImageMode = 'blank' | 'blankpure' | string;

export type TemplateImageArgs = {
  code: string;
  mode: TemplateImageMode;
  letters?: string;
};

export type UseTemplateImageResult = {
  isLoading: boolean;
  error: AppError | null;

  /**
   * Lädt das Bild als Blob und gibt eine Object-URL zurück.
   */
  getImageUrl: (args: TemplateImageArgs) => Promise<string | null>;

  /**
   * Lädt das Bild und öffnet es in einem neuen Tab.
   */
  openInNewTab: (args: TemplateImageArgs) => Promise<void>;
};

export default function useTemplateImage(): UseTemplateImageResult {
  const { token } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const getImageUrl = useCallback(
    async (args: TemplateImageArgs): Promise<string | null> => {
      const { code, mode, letters } = args;

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useTemplateImage',
          functionName: 'getImageUrl',
          service: 'beefont',
        });
        err.severity = 'page';
        errorBus.emit(err);
        setError(err);
        return null;
      }

      setIsLoading(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedCode = encodeURIComponent(code);

      try {
        const res = await apiApp.get<Blob>(
          `/templates/${encodedCode}/image/`,
          {
            headers,
            responseType: 'blob',
            params: {
              mode,
              ...(letters ? { letters } : {}),
            },
          },
        );

        // Axios mit responseType 'blob' liefert direkt einen Blob
        const blob = res.data as Blob;
        const objectUrl = URL.createObjectURL(blob);
        return objectUrl;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useTemplateImage',
          functionName: 'getImageUrl',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  const openInNewTab = useCallback(
    async (args: TemplateImageArgs): Promise<void> => {
      const url = await getImageUrl(args);
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [getImageUrl],
  );

  return {
    isLoading,
    error,
    getImageUrl,
    openInNewTab,
  };
}

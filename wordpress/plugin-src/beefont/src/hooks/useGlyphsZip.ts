// src/hooks/useGlyphsZip.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

export type UseGlyphsZipResult = {
  isDownloadingDefault: boolean;
  isDownloadingAll: boolean;
  isUploading: boolean;
  error: AppError | null;

  downloadDefaultZip: () => Promise<void>;
  downloadAllZip: () => Promise<void>;
  uploadGlyphsZip: (file: File) => Promise<void>;
};

export default function useGlyphsZip(
  sidParam: string,
): UseGlyphsZipResult {
  const { token } = useUser();
  const { activeJob } = useApp();

  const sid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  const [isDownloadingDefault, setIsDownloadingDefault] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.debug('[beefont/useGlyphsZip] SID resolution @', time, {
      sidParam,
      activeJobSid: activeJob?.sid ?? null,
      effectiveSid: sid,
    });
  }, [sidParam, activeJob, sid]);

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const guardAuthAndSid = (fnName: string): AppError | null => {
    if (!sid) {
      const err = toAppError(new Error('No job SID provided'), {
        component: 'useGlyphsZip',
        functionName: fnName,
        service: 'beefont',
      });
      setError(err);
      return err;
    }

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'useGlyphsZip',
        functionName: fnName,
        service: 'beefont',
      });
      if (err.httpStatus === 401 || err.httpStatus === 403) {
        err.severity = 'page';
        errorBus.emit(err);
      }
      setError(err);
      return err;
    }

    return null;
  };

  const downloadDefaultZip = useCallback(async (): Promise<void> => {
    const guard = guardAuthAndSid('downloadDefaultZip');
    if (guard) return Promise.reject(guard);

    setIsDownloadingDefault(true);
    setError(null);

    const encodedSid = encodeURIComponent(sid);
    const url = `/jobs/${encodedSid}/glyphs/download/default-zip/`;
    const headers = authHeaders(token as string);

    try {
      const res = await apiApp.get(url, {
        headers,
        responseType: 'blob',
      });
      const filename = `beefont_${encodedSid}_glyphs_default.zip`;
      triggerBlobDownload(res.data as Blob, filename);
      setIsDownloadingDefault(false);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'useGlyphsZip',
        functionName: 'downloadDefaultZip',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      setIsDownloadingDefault(false);
      return Promise.reject(appErr);
    }
  }, [sid, token]);

  const downloadAllZip = useCallback(async (): Promise<void> => {
    const guard = guardAuthAndSid('downloadAllZip');
    if (guard) return Promise.reject(guard);

    setIsDownloadingAll(true);
    setError(null);

    const encodedSid = encodeURIComponent(sid);
    const url = `/jobs/${encodedSid}/glyphs/download/all-zip/`;
    const headers = authHeaders(token as string);

    try {
      const res = await apiApp.get(url, {
        headers,
        responseType: 'blob',
      });
      const filename = `beefont_${encodedSid}_glyphs_all.zip`;
      triggerBlobDownload(res.data as Blob, filename);
      setIsDownloadingAll(false);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'useGlyphsZip',
        functionName: 'downloadAllZip',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      setIsDownloadingAll(false);
      return Promise.reject(appErr);
    }
  }, [sid, token]);

  const uploadGlyphsZip = useCallback(
    async (file: File): Promise<void> => {
      const guard = guardAuthAndSid('uploadGlyphsZip');
      if (guard) return Promise.reject(guard);

      setIsUploading(true);
      setError(null); 

      const encodedSid = encodeURIComponent(sid);
      const url = `/jobs/${encodedSid}/upload/glyphs-zip/`;
      const headers = {
        ...authHeaders(token as string),
        // Axios will set proper multipart boundary; you just hint it.
        'Content-Type': 'multipart/form-data',
      };

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await apiApp.post(url, formData, { headers });
        console.log('[beefont/useGlyphsZip] uploadGlyphsZip OK:', res.data);
        setIsUploading(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphsZip',
          functionName: 'uploadGlyphsZip',
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

  return {
    isDownloadingDefault,
    isDownloadingAll,
    isUploading,
    error,
    downloadDefaultZip,
    downloadAllZip,
    uploadGlyphsZip,
  };
}

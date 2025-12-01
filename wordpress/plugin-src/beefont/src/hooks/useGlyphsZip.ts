// src/hooks/useGlyphsZip.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { toAppError, errorBus, type AppError } from '@bee/common/error'; 
import { DEFAULT_GLYPH_FORMAT,GlyphFormat } from '@mytypes/glyph';

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
  formatOverride?: GlyphFormat,
): UseGlyphsZipResult {
  const { token } = useUser();
  const { activeJob, activeGlyphFormat } = useApp();

  const sid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  // Resolve the *effective* format:
  // 1) explicit override from hook caller
  // 2) activeGlyphFormat from AppContext (if valid)
  // 3) DEFAULT_GLYPH_FORMAT from @mytypes/glyph (currently 'svg')
  const format: GlyphFormat = (() => {
    if (formatOverride === 'png' || formatOverride === 'svg') {
      return formatOverride;
    }

    const ctx = (activeGlyphFormat || '').toLowerCase();
    if (ctx === 'png' || ctx === 'svg') {
      return ctx;
    }

    return DEFAULT_GLYPH_FORMAT;
  })();

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
      format,
    });
  }, [sidParam, activeJob, sid, format]);

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

  const makeZipUrl = (kind: 'default' | 'all'): string => {
    const encodedSid = encodeURIComponent(sid);
    const suffix =
      kind === 'default' ? 'download/default-zip/' : 'download/all-zip/';
    return `/jobs/${encodedSid}/glyphs/${format}/${suffix}`;
  };

  const performDownload = useCallback(
    async (kind: 'default' | 'all'): Promise<void> => {
      const fnName =
        kind === 'default' ? 'downloadDefaultZip' : 'downloadAllZip';
      const guard = guardAuthAndSid(fnName);
      if (guard) return Promise.reject(guard);

      if (kind === 'default') {
        setIsDownloadingDefault(true);
      } else {
        setIsDownloadingAll(true);
      }
      setError(null);

      const encodedSid = encodeURIComponent(sid);
      const url = makeZipUrl(kind);
      const headers = authHeaders(token as string);

      try {
        const res = await apiApp.get(url, {
          headers,
          responseType: 'blob',
        });

        const filename =
          kind === 'default'
            ? `beefont_${encodedSid}_glyphs_default_${format}.zip`
            : `beefont_${encodedSid}_glyphs_all_${format}.zip`;

        triggerBlobDownload(res.data as Blob, filename);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphsZip',
          functionName: fnName,
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        if (kind === 'default') {
          setIsDownloadingDefault(false);
        } else {
          setIsDownloadingAll(false);
        }
        return Promise.reject(appErr);
      }

      if (kind === 'default') {
        setIsDownloadingDefault(false);
      } else {
        setIsDownloadingAll(false);
      }
    },
    [sid, token, format],
  );

  const downloadDefaultZip = useCallback(
    () => performDownload('default'),
    [performDownload],
  );

  const downloadAllZip = useCallback(
    () => performDownload('all'),
    [performDownload],
  );

  const uploadGlyphsZip = useCallback(
    async (file: File): Promise<void> => {
      const guard = guardAuthAndSid('uploadGlyphsZip');
      if (guard) return Promise.reject(guard);

      setIsUploading(true);
      setError(null);

      const encodedSid = encodeURIComponent(sid);
      const url = `/jobs/${encodedSid}/glyphs/${format}/upload-zip/`;
      const headers = {
        ...authHeaders(token as string),
        'Content-Type': 'multipart/form-data',
      };

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await apiApp.post(url, formData, { headers });
        console.log('[beefont/useGlyphsZip] uploadGlyphsZip OK:', res.data);
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

      setIsUploading(false);
    },
    [sid, token, format],
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
   
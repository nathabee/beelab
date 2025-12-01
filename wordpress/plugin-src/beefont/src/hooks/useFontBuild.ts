// src/hooks/useFontBuild.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiApp, authHeaders, buildAppUrl } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';
import { useApp } from '@context/AppContext';
import type { FontBuild, BuildRequestPayload } from '@mytypes/fontBuild';
 
import { DEFAULT_GLYPH_FORMAT,GlyphFormat } from '@mytypes/glyph';

export type UseFontBuildOptions = {
  manual?: boolean;
  /**
   * Default glyph format when building fonts if the caller
   * does not provide an explicit format override.
   */
  defaultFormat?: GlyphFormat;    
};

export type UseFontBuildResult = {
  builds: FontBuild[];
  isLoadingBuilds: boolean;
  isBuilding: boolean;
  error: AppError | null;

  fetchBuilds: () => Promise<void>;

  /**
   * Build a font for one language.
   * If `format` is omitted, `defaultFormat` from options is used (default 'png').
   */
  buildLanguage: (
    languageCode: string,
    format?: GlyphFormat,
  ) => Promise<FontBuild | null>;

  // URL helpers (keep for special cases / non-UI usage)
  getTtfDownloadUrl: (languageCode: string) => string;
  getZipDownloadUrl: () => string;

  // Authenticated download helpers for UI
  downloadTtf: (languageCode: string) => Promise<void>;
  downloadZip: () => Promise<void>;
};

export default function useFontBuild(
  sidParam: string,
  options: UseFontBuildOptions = {},
): UseFontBuildResult {
  const { manual = false, defaultFormat = DEFAULT_GLYPH_FORMAT } = options;
  const { token } = useUser();
  const { activeJob } = useApp();

  const sid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  const [builds, setBuilds] = useState<FontBuild[]>([]);
  const [isLoadingBuilds, setIsLoadingBuilds] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.debug('[beefont/useFontBuild] SID resolution @', time, {
      sidParam,
      activeJobSid: activeJob?.sid ?? null,
      effectiveSid: sid,
      defaultFormat,
    });
  }, [sidParam, activeJob, sid, defaultFormat]);

  const fetchBuilds = useCallback(async (): Promise<void> => {
    const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
    console.log('[beefont/useFontBuild] fetchBuilds @', time, 'sid=', sid);

    if (!sid) {
      const err = toAppError(new Error('No job SID provided'), {
        component: 'useFontBuild',
        functionName: 'fetchBuilds',
        service: 'beefont',
      });
      setError(err);
      setBuilds([]);
      return Promise.reject(err);
    }

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'useFontBuild',
        functionName: 'fetchBuilds',
        service: 'beefont',
      });
      if (err.httpStatus === 401 || err.httpStatus === 403) {
        err.severity = 'page';
        errorBus.emit(err);
      }
      setError(err);
      setBuilds([]);
      return Promise.reject(err);
    }

    setIsLoadingBuilds(true);
    setError(null);

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);
    const url = `/jobs/${encodedSid}/builds/`;

    try {
      const res = await apiApp.get<FontBuild[]>(url, { headers });
      setBuilds(res.data);
      setIsLoadingBuilds(false);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'useFontBuild',
        functionName: 'fetchBuilds',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      setBuilds([]);
      setIsLoadingBuilds(false);
      return Promise.reject(appErr);
    }
  }, [sid, token]);

  const buildLanguage = useCallback(
    async (
      languageCode: string,
      formatOverride?: GlyphFormat,
    ): Promise<FontBuild | null> => {
      const trimmedLang = languageCode.trim(); 
      const effectiveFormat: GlyphFormat =  formatOverride ?? defaultFormat ?? DEFAULT_GLYPH_FORMAT;


      console.log(
        '[beefont/useFontBuild] buildLanguage sid=',
        sid,
        'language=',
        trimmedLang,
        'format=',
        effectiveFormat,
      );

      if (!sid) {
        const err = toAppError(new Error('No job SID provided'), {
          component: 'useFontBuild',
          functionName: 'buildLanguage',
          service: 'beefont',
        });
        setError(err);
        return Promise.reject(err);
      }

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useFontBuild',
          functionName: 'buildLanguage',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        setError(err);
        return Promise.reject(err);
      }

      setIsBuilding(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const encodedLang = encodeURIComponent(trimmedLang);
      const encodedFormat = encodeURIComponent(effectiveFormat);

      // New backend route:
      // POST /jobs/<sid>/build-ttf/<language>/<format>/
      const url = `/jobs/${encodedSid}/build-ttf/${encodedLang}/${encodedFormat}/`;

      // Backend now gets language + format from the path; body can be empty
      const payload: Partial<BuildRequestPayload> = {};

      try {
        const res = await apiApp.post<FontBuild>(url, payload, { headers });
        const build = res.data;

        setBuilds(prev => {
          const idx = prev.findIndex(b => b.id === build.id);
          if (idx === -1) return [...prev, build];
          const next = [...prev];
          next[idx] = build;
          return next;
        });

        setIsBuilding(false);
        return build;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useFontBuild',
          functionName: 'buildLanguage',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsBuilding(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token, defaultFormat],
  );

  // URL helpers – unchanged, still format-agnostic for downloads
  const getTtfDownloadUrl = useCallback(
    (languageCode: string): string => {
      if (!sid) return '';
      const encodedSid = encodeURIComponent(sid);
      const encodedLang = encodeURIComponent(languageCode.trim());
      return buildAppUrl(`/jobs/${encodedSid}/download/ttf/${encodedLang}/`);
    },
    [sid],
  );

  const getZipDownloadUrl = useCallback((): string => {
    if (!sid) return '';
    const encodedSid = encodeURIComponent(sid);
    return buildAppUrl(`/jobs/${encodedSid}/download/zip/`);
  }, [sid]);

  // HELPER: client-side Blob download
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

  // Authenticated ZIP download
  const downloadZip = useCallback(async (): Promise<void> => {
    if (!sid) {
      const err = toAppError(new Error('No job SID provided'), {
        component: 'useFontBuild',
        functionName: 'downloadZip',
        service: 'beefont',
      });
      setError(err);
      return Promise.reject(err);
    }

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'useFontBuild',
        functionName: 'downloadZip',
        service: 'beefont',
      });
      if (err.httpStatus === 401 || err.httpStatus === 403) {
        err.severity = 'page';
        errorBus.emit(err);
      }
      setError(err);
      return Promise.reject(err);
    }

    const headers = authHeaders(token);
    const encodedSid = encodeURIComponent(sid);
    const url = `/jobs/${encodedSid}/download/zip/`;

    try {
      const res = await apiApp.get(url, {
        headers,
        responseType: 'blob',
      });
      const filename = `beefont_${encodedSid}.zip`;
      triggerBlobDownload(res.data as Blob, filename);
    } catch (e) {
      const appErr: AppError = toAppError(e, {
        component: 'useFontBuild',
        functionName: 'downloadZip',
        service: 'beefont',
      });
      if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
        appErr.severity = 'page';
        errorBus.emit(appErr);
      }
      setError(appErr);
      return Promise.reject(appErr);
    }
  }, [sid, token]);

  // Authenticated TTF download for one language
  const downloadTtf = useCallback(
    async (languageCode: string): Promise<void> => {
      const lang = languageCode.trim();

      if (!sid) {
        const err = toAppError(new Error('No job SID provided'), {
          component: 'useFontBuild',
          functionName: 'downloadTtf',
          service: 'beefont',
        });
        setError(err);
        return Promise.reject(err);
      }

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useFontBuild',
          functionName: 'downloadTtf',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        setError(err);
        return Promise.reject(err);
      }

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const encodedLang = encodeURIComponent(lang);
      const url = `/jobs/${encodedSid}/download/ttf/${encodedLang}/`;

      try {
        const res = await apiApp.get(url, {
          headers,
          responseType: 'blob',
        });
        const filename = `beefont_${encodedSid}_${lang}.ttf`;
        triggerBlobDownload(res.data as Blob, filename);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useFontBuild',
          functionName: 'downloadTtf',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        return Promise.reject(appErr);
      }
    },
    [sid, token],
  );

  useEffect(() => {
    if (manual) return;
    if (!sid) {
      console.warn('[beefont/useFontBuild] no SID, skipping initial fetch');
      return;
    }
    fetchBuilds().catch(err => {
      console.error('[beefont/useFontBuild] initial fetch failed:', err);
    });
  }, [manual, sid, fetchBuilds]);

  return {
    builds,
    isLoadingBuilds,
    isBuilding,
    error,
    fetchBuilds,
    buildLanguage,
    getTtfDownloadUrl,
    getZipDownloadUrl,
    downloadTtf,
    downloadZip,
  };
}

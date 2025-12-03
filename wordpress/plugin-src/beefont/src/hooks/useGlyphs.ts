// src/hooks/useGlyphs.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import { useApp } from '@context/AppContext';

import type { Glyph,DEFAULT_GLYPH_FORMAT, GlyphVariantSelection, GlyphFormat } from '@mytypes/glyph'; 


export type UseGlyphsOptions = {
  manual?: boolean;
  initialLetter?: string;
  formattype?: GlyphFormat;
};

export type UseGlyphsResult = {
  glyphs: Glyph[];
  isLoading: boolean;
  isUpdating: boolean;
  error: AppError | null;

  letter: string;
  formattype: GlyphFormat;

  fetchGlyphs: (opts?: { letter?: string }) => Promise<void>;
  selectDefault: (
    letter: string,
    selection: GlyphVariantSelection,
  ) => Promise<void>;
  uploadGlyphFromEditor: (letter: string, blob: Blob) => Promise<Glyph | null>;
  replaceGlyphFromEditor: (glyphId: number, blob: Blob) => Promise<Glyph | null>;
  deleteGlyph: (glyphId: number) => Promise<void>;
};

export default function useGlyphs(
  sid: string,
  options: UseGlyphsOptions = {},
): UseGlyphsResult {
  const {
    manual = false,
    initialLetter = '',
    formattype: overrideFormattype,
  } = options;

  const { token } = useUser();
  const { activeGlyphFormat } = useApp();

  const formattype: GlyphFormat = (() => {
    // 1) explicit override always wins if valid
    if (overrideFormattype === 'png' || overrideFormattype === 'svg') {
      return overrideFormattype;
    }

    // 2) otherwise normalize the context value if valid
    const ctx = (activeGlyphFormat || '').toLowerCase();
    if (ctx === 'png' || ctx === 'svg') {
      return ctx;
    }

    // 3) final fallback: global default from mytypes (currently 'svg')
    return DEFAULT_GLYPH_FORMAT;
  })();


  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [letter, setLetter] = useState<string>(initialLetter);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const guardAuthAndSid = (fnName: string): AppError | null => {
    if (!sid) {
      const err = toAppError(new Error('No job SID provided'), {
        component: 'useGlyphs',
        functionName: fnName,
        service: 'beefont',
      });
      setError(err);
      return err;
    }

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'useGlyphs',
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

  const fetchGlyphs = useCallback(
    async (opts?: { letter?: string }): Promise<void> => {
      const time = new Date().toLocaleTimeString('de-DE', { hour12: false });
      const nextLetter =
        typeof opts?.letter === 'string' ? opts.letter.trim() : letter;
      console.log(
        '[beefont/useGlyphs] fetchGlyphs @',
        time,
        'sid=',
        sid,
        'formattype=',
        formattype,
        'letter=',
        nextLetter || '(all)',
      );

      const guard = guardAuthAndSid('fetchGlyphs');
      if (guard) {
        setGlyphs([]);
        return Promise.reject(guard);
      }

      setIsLoading(true);
      setError(null);

      const headers = authHeaders(token as string);
      const encodedSid = encodeURIComponent(sid);
      const encodedFmt = encodeURIComponent(formattype);

      if (typeof opts?.letter === 'string') {
        setLetter(nextLetter);
      }

      let url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/`;
      if (nextLetter && nextLetter.length > 0) {
        url += `?letter=${encodeURIComponent(nextLetter)}`;
      }

      try {
        const res = await apiApp.get<Glyph[]>(url, { headers });
        setGlyphs(res.data);
        setIsLoading(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphs',
          functionName: 'fetchGlyphs',
          service: 'beefont',
        });

        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }

        setError(appErr);
        setGlyphs([]);
        setIsLoading(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token, letter, formattype],
  );

  const selectDefault = useCallback(
    async (
      letterParam: string,
      selection: GlyphVariantSelection,
    ): Promise<void> => {
      const trimmedLetter = letterParam.trim();
      console.log(
        '[beefont/useGlyphs] selectDefault sid=',
        sid,
        'formattype=',
        formattype,
        'letter=',
        trimmedLetter,
        'selection=',
        selection,
      );

      const guard = guardAuthAndSid('selectDefault');
      if (guard) return Promise.reject(guard);

      if (
        selection.glyph_id == null &&
        selection.variant_index == null
      ) {
        const err = toAppError(
          new Error("Either 'glyph_id' or 'variant_index' must be set."),
          {
            component: 'useGlyphs',
            functionName: 'selectDefault',
            service: 'beefont',
          },
        );
        setError(err);
        return Promise.reject(err);
      }

      setIsUpdating(true);

      const headers = authHeaders(token as string);
      const encodedSid = encodeURIComponent(sid);
      const encodedFmt = encodeURIComponent(formattype);
      const encodedLetter = encodeURIComponent(trimmedLetter);
      const url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/${encodedLetter}/select/`;

      try {
        await apiApp.post(url, selection, { headers });

        await fetchGlyphs({ letter: trimmedLetter });

        setIsUpdating(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphs',
          functionName: 'selectDefault',
          service: 'beefont',
        });

        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }

        setError(appErr);
        setIsUpdating(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token, formattype, fetchGlyphs],
  );

  const deleteGlyph = useCallback(
    async (glyphId: number): Promise<void> => {
      console.log(
        '[beefont/useGlyphs] deleteGlyph sid=',
        sid,
        'formattype=',
        formattype,
        'glyphId=',
        glyphId,
        'currentLetterFilter=',
        letter || '(all)',
      );

      const guard = guardAuthAndSid('deleteGlyph');
      if (guard) return Promise.reject(guard);

      setIsUpdating(true);
      setError(null);

      const headers = authHeaders(token as string);
      const encodedSid = encodeURIComponent(sid);
      const encodedFmt = encodeURIComponent(formattype);
      const url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/${glyphId}/delete/`;

      try {
        await apiApp.delete(url, { headers });

        await fetchGlyphs({ letter });

        setIsUpdating(false);
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphs',
          functionName: 'deleteGlyph',
          service: 'beefont',
        });

        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }

        setError(appErr);
        setIsUpdating(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token, formattype, letter, fetchGlyphs],
  );

  const uploadGlyphFromEditor = useCallback(
    async (letterParam: string, blob: Blob): Promise<Glyph | null> => {
      const trimmed = letterParam.trim();
      console.log(
        '[beefont/useGlyphs] uploadGlyphFromEditor sid=',
        sid,
        'formattype=',
        formattype,
        'letter=',
        trimmed,
      );

      const guard = guardAuthAndSid('uploadGlyphFromEditor');
      if (guard) return Promise.reject(guard);

      if (!trimmed) {
        const err = toAppError(new Error('Letter is required'), {
          component: 'useGlyphs',
          functionName: 'uploadGlyphFromEditor',
          service: 'beefont',
        });
        setError(err);
        return Promise.reject(err);
      }

      setIsUpdating(true);
      setError(null);

      const headers = authHeaders(token as string);
      const encodedSid = encodeURIComponent(sid);
      const encodedFmt = encodeURIComponent(formattype);
      const url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/upload/`;

      const extension = formattype === 'svg' ? 'svg' : 'png';

      const formData = new FormData();
      formData.append('letter', trimmed);
      formData.append('file', blob, `${trimmed}.${extension}`);

      try {
        const res = await apiApp.post<Glyph>(url, formData, {
          headers,
        });

        const created = res.data;

        setGlyphs(prev => {
          if (!letter || letter === trimmed) {
            return [...prev, created];
          }
          return prev;
        });

        setIsUpdating(false);
        return created;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphs',
          functionName: 'uploadGlyphFromEditor',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsUpdating(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token, letter, formattype],
  );

    const replaceGlyphFromEditor = useCallback(
    async (glyphId: number, blob: Blob): Promise<Glyph | null> => {
      console.log(
        '[beefont/useGlyphs] replaceGlyphFromEditor sid=',
        sid,
        'formattype=',
        formattype,
        'glyphId=',
        glyphId,
      );

      const guard = guardAuthAndSid('replaceGlyphFromEditor');
      if (guard) return Promise.reject(guard);

      setIsUpdating(true);
      setError(null);

      const headers = authHeaders(token as string);
      const encodedSid = encodeURIComponent(sid);
      const encodedFmt = encodeURIComponent(formattype);
      const url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/${glyphId}/replace/`;

      const extension = formattype === 'svg' ? 'svg' : 'png';

      const formData = new FormData();
      formData.append('file', blob, `glyph_${glyphId}.${extension}`);

      try {
        const res = await apiApp.post<Glyph>(url, formData, { headers });
        const updated = res.data;

        // Liste aktualisieren (optional zusätzlich fetchGlyphs, wenn du sicher gehen willst)
        setGlyphs(prev =>
          prev.map(g => (g.id === updated.id ? updated : g)),
        );

        setIsUpdating(false);
        return updated;
      } catch (e) {
        const appErr: AppError = toAppError(e, {
          component: 'useGlyphs',
          functionName: 'replaceGlyphFromEditor',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setError(appErr);
        setIsUpdating(false);
        return Promise.reject(appErr);
      }
    },
    [sid, token, formattype],
  );

  useEffect(() => {
    if (manual) return;
    fetchGlyphs().catch(err => {
      console.error('[beefont/useGlyphs] initial fetch failed:', err);
    });
  }, [manual, fetchGlyphs]);

  return {
    glyphs,
    isLoading,
    isUpdating,
    error,
    letter,
    formattype,
    fetchGlyphs,
    selectDefault,
    deleteGlyph,
    uploadGlyphFromEditor,
    replaceGlyphFromEditor,
  };
}

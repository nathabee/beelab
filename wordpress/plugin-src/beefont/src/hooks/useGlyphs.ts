// src/hooks/useGlyphs.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import type { Glyph } from '@mytypes/glyph';
import type { GlyphVariantSelection } from '@mytypes/glyph';

export type UseGlyphsOptions = {
  /**
   * If true, the hook will NOT auto-fetch on mount.
   * You can then call fetchGlyphs() manually.
   */
  manual?: boolean;

  /**
   * Optional initial letter filter. If set,
   * the first fetch will call `/glyphs/{letter}/` instead of `/glyphs/`.
   */
  initialLetter?: string;
};

export type UseGlyphsResult = {
  glyphs: Glyph[];
  isLoading: boolean;
  isUpdating: boolean;
  error: AppError | null;

  /**
   * Currently active letter filter (if any).
   * For `/glyphs/` (all), this is an empty string.
   */
  letter: string;

  /**
   * Fetch glyphs for the whole job or for a given letter.
   *
   * - Without args → uses the last letter filter.
   * - With `{ letter }` → updates the filter and fetches for that letter.
   */
  fetchGlyphs: (opts?: { letter?: string }) => Promise<void>;

  /**
   * Select a default variant for a given letter.
   *
   * Payload must match GlyphVariantSelectionSerializer:
   *   { glyph_id?: number; variant_index?: number }
   *
   * On success this will refresh glyphs for that letter.
   */
  selectDefault: (
    letter: string,
    selection: GlyphVariantSelection
  ) => Promise<void>;

  /**
   * Upload a single glyph PNG coming from the canvas editor.
   * Backed by POST /jobs/{sid}/glyphs/from-editor/.
   *
   * Returns the created Glyph on success.
   */
  uploadGlyphFromEditor: (letter: string, blob: Blob) => Promise<Glyph | null>;
};

export default function useGlyphs(
  sid: string,
  options: UseGlyphsOptions = {},
): UseGlyphsResult {
  const { manual = false, initialLetter = '' } = options;
  const { token } = useUser();

  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [letter, setLetter] = useState<string>(initialLetter);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

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
        'letter=',
        nextLetter || '(all)',
      );

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useGlyphs',
          functionName: 'fetchGlyphs',
          service: 'beefont',
        });
        // For auth problems, treat as page-level.
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        setError(err);
        setGlyphs([]);
        return Promise.reject(err);
      }

      setIsLoading(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);

      // Persist the new letter filter in state if it was provided.
      if (typeof opts?.letter === 'string') {
        setLetter(nextLetter);
      }

      const baseUrl =
        nextLetter && nextLetter.length > 0
          ? `/jobs/${encodedSid}/glyphs/${encodeURIComponent(nextLetter)}/`
          : `/jobs/${encodedSid}/glyphs/`;

      try {
        const res = await apiApp.get<Glyph[]>(baseUrl, { headers });
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
    [sid, token, letter],
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
        'letter=',
        trimmedLetter,
        'selection=',
        selection,
      );

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useGlyphs',
          functionName: 'selectDefault',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        return Promise.reject(err);
      }

      // Simple validation mirroring the backend:
      // at least one of glyph_id / variant_index must be present.
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

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const encodedLetter = encodeURIComponent(trimmedLetter);
      const url = `/jobs/${encodedSid}/glyphs/${encodedLetter}/select/`;

      try {
        await apiApp.post(url, selection, { headers });

        // On success, refresh glyphs for this letter.
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
    [sid, token, fetchGlyphs],
  );

  const uploadGlyphFromEditor = useCallback(
    async (letterParam: string, blob: Blob): Promise<Glyph | null> => {
      const trimmed = letterParam.trim();
      console.log(
        '[beefont/useGlyphs] uploadGlyphFromEditor sid=',
        sid,
        'letter=',
        trimmed,
      );

      if (!sid) {
        const err = toAppError(new Error('No job SID provided'), {
          component: 'useGlyphs',
          functionName: 'uploadGlyphFromEditor',
          service: 'beefont',
        });
        setError(err);
        return Promise.reject(err);
      }

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useGlyphs',
          functionName: 'uploadGlyphFromEditor',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        setError(err);
        return Promise.reject(err);
      }

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

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const url = `/jobs/${encodedSid}/upload/glyph-png/`;

      const formData = new FormData();
      formData.append('letter', trimmed);
      formData.append('file', blob, `${trimmed}.png`);

      try {
        const res = await apiApp.post<Glyph>(url, formData, {
          headers,
        });

        const created = res.data;

        // If the editor is working for a specific letter that matches
        // the current filter, we can optimistically append it.
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
    [sid, token, letter],
  );

  // Automatic initial load, unless caller wants full manual control.
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
    fetchGlyphs,
    selectDefault,
    uploadGlyphFromEditor,
  };
}

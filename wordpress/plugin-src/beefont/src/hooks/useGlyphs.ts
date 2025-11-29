// src/hooks/useGlyphs.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';
import { toAppError, errorBus, type AppError } from '@bee/common/error';

import { useApp } from '@context/AppContext';

import type { Glyph } from '@mytypes/glyph';
import type { GlyphVariantSelection } from '@mytypes/glyph';

type GlyphFormatType = 'png' | 'svg';

export type UseGlyphsOptions = {
  /**
   * If true, the hook will NOT auto-fetch on mount.
   * You can then call fetchGlyphs() manually.
   */
  manual?: boolean;

  /**
   * Optional initial letter filter. If set,
   * the first fetch will call `/glyphs/<formattype>/?letter=X`
   * instead of `/glyphs/<formattype>/` (all letters).
   */
  initialLetter?: string;

  /**
   * Optional explicit formattype override ('png' | 'svg').
   *
   * - If provided, this value is used for all requests.
   * - If omitted, the hook falls back to AppContext.activeGlyphFormat.
   */
  formattype?: GlyphFormatType;
};

export type UseGlyphsResult = {
  glyphs: Glyph[];
  isLoading: boolean;
  isUpdating: boolean;
  error: AppError | null;

  /**
   * Currently active letter filter (if any).
   * For `/glyphs/<formattype>/` (all), this is an empty string.
   */
  letter: string;

  /**
   * Effective formattype used by this hook ('png' | 'svg').
   * This is either:
   *   - options.formattype, if set
   *   - otherwise AppContext.activeGlyphFormat (normalized)
   */
  formattype: GlyphFormatType;

  /**
   * Fetch glyphs for the whole job or for a given letter.
   *
   * - Without args → uses the last letter filter.
   * - With `{ letter }` → updates the filter and fetches for that letter.
   */
  fetchGlyphs: (opts?: { letter?: string }) => Promise<void>;

  /**
   * Select a default variant for a given letter in the current formattype.
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
   * Upload a single glyph coming from the editor.
   *
   * - If formattype='png' → POST /jobs/{sid}/glyphs/png/upload/
   *   (blob should be image/png)
   * - If formattype='svg' → POST /jobs/{sid}/glyphs/svg/upload/
   *   (blob should contain an SVG file)
   *
   * Returns the created Glyph on success.
   */
  uploadGlyphFromEditor: (letter: string, blob: Blob) => Promise<Glyph | null>;
  /**
   * Delete a single glyph variant by id.
   *
   * `letterForRefresh` wird genutzt, um nach Löschung die Liste für diesen Buchstaben
   * neu zu laden (oder leer = alle).
   */
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

  // Resolve effective formattype:
  // 1) explicit override from hook options
  // 2) otherwise AppContext.activeGlyphFormat
  // 3) fallback 'png'
  const formattype: GlyphFormatType =
    overrideFormattype === 'svg' || overrideFormattype === 'png'
      ? overrideFormattype
      : ((
        (activeGlyphFormat || '').toLowerCase() === 'svg'
          ? 'svg'
          : 'png'
      ) as GlyphFormatType);

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
        'formattype=',
        formattype,
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
      const encodedFmt = encodeURIComponent(formattype);

      // Persist the new letter filter in state if it was provided.
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

      // Validation mirroring backend:
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
      const encodedFmt = encodeURIComponent(formattype);
      const encodedLetter = encodeURIComponent(trimmedLetter);
      const url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/${encodedLetter}/select/`;

      try {
        await apiApp.post(url, selection, { headers });

        // On success, refresh glyphs for this letter (same formattype).
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

      if (!token) {
        const err = toAppError(new Error('No auth token'), {
          component: 'useGlyphs',
          functionName: 'deleteGlyph',
          service: 'beefont',
        });
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          err.severity = 'page';
          errorBus.emit(err);
        }
        setError(err);
        return Promise.reject(err);
      }

      if (!sid) {
        const err = toAppError(new Error('No job SID provided'), {
          component: 'useGlyphs',
          functionName: 'deleteGlyph',
          service: 'beefont',
        });
        setError(err);
        return Promise.reject(err);
      }

      setIsUpdating(true);
      setError(null);

      const headers = authHeaders(token);
      const encodedSid = encodeURIComponent(sid);
      const encodedFmt = encodeURIComponent(formattype);
      const url = `/jobs/${encodedSid}/glyphs/${encodedFmt}/${glyphId}/delete/`;

      try {
        await apiApp.delete(url, { headers });

        // IMPORTANT: refresh with the CURRENT filter
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
    [sid, token, letter, formattype],
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
    formattype,
    fetchGlyphs,
    selectDefault,
    deleteGlyph,
    uploadGlyphFromEditor,
  };
}

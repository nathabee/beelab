// src/pages/MissingCharactersPage.tsx
'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useMissingCharacters from '@hooks/useMissingCharacters';
import AlphabetGrid, { type AlphabetCell } from '@components/AlphabetGrid';

import { friendlyMessage, type AppError } from '@bee/common/error';
import type { GlyphFormat } from '@hooks/useGlyphsZip'; // 'png' | 'svg'
import { useApp } from '@context/AppContext';

const MissingCharactersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sid = searchParams.get('sid') ?? '';
  const language = searchParams.get('language') ?? '';
  const urlFormattypeRaw = (searchParams.get('formattype') ?? '').toLowerCase();

  const { activeGlyphFormat, setActiveGlyphFormat } = useApp();

  // Effective format:
  // 1) ?formattype=png|svg overrides
  // 2) otherwise global activeGlyphFormat
  const effectiveFormat: GlyphFormat =
    urlFormattypeRaw === 'png' || urlFormattypeRaw === 'svg'
      ? (urlFormattypeRaw as GlyphFormat)
      : activeGlyphFormat;

  const formatLabel = effectiveFormat.toUpperCase();

  // Prevent repeated identical requests (helps with StrictMode double mounts)
  const lastRequestKeyRef = useRef<string | null>(null);

  const {
    status,
    isLoading,
    isRefreshing,
    error,
    fetchStatus,
  } = useMissingCharacters(sid || '', language || '', {
    manual: true,
    format: effectiveFormat,
  });

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  // Initial + on-change fetch, deduped
  useEffect(() => {
    if (!sid || !language) return;

    const key = `${sid}:${language}:${effectiveFormat}`;
    if (lastRequestKeyRef.current === key) return;
    lastRequestKeyRef.current = key;

    fetchStatus().catch(err => {
      console.error('[MissingCharactersPage] auto fetchStatus failed:', err);
    });
  }, [sid, language, effectiveFormat, fetchStatus]);

  if (!sid || !language) {
    return (
      <section className="bf-page bf-page--missing-characters">
        <header className="bf-page__header">
          <h1>BeeFont – Missing characters</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job and/or language specified. Open this screen from the job detail
          page.
        </div>
      </section>
    );
  }

  const missingCells: AlphabetCell[] = useMemo(() => {
    if (!status || !status.missing_chars) return [];
    const chars = Array.from(status.missing_chars);
    return chars.map(ch => ({
      char: ch,
      isCovered: false,
    }));
  }, [status]);

  const handleRefresh = () => {
    const key = `${sid}:${language}:${effectiveFormat}`;
    lastRequestKeyRef.current = key;

    fetchStatus().catch(err => {
      console.error('[MissingCharactersPage] fetchStatus failed:', err);
    });
  };

  /**
   * “Create next glyph”:
   * - picks the first missing character from the status
   * - aligns global activeGlyphFormat with the effective format of this page
   * - navigates to GlyphEditorPage with ?letter=...
   * GlyphEditorPage itself chooses PNG/SVG editor based on activeGlyphFormat.
   */
  const handleCreateNextGlyph = () => {
    if (!status || !status.missing_chars) return;
    const nextLetter = status.missing_chars[0];
    if (!nextLetter) return;

    // make sure the editor uses the same format as this status page
    setActiveGlyphFormat(effectiveFormat);

    navigate(
      `/glypheditor?letter=${encodeURIComponent(nextLetter)}`,
    );
  };

  /**
   * Old behaviour: plan pages for PNG mode.
   * Only meaningful for PNG, so we keep it PNG-only.
   */
  const handlePlanPagesPng = () => {
    if (!status || !status.missing_chars) return;

    const missingLetters = status.missing_chars;

    navigate(
      `/printupload?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(
        language,
      )}&letters=${encodeURIComponent(missingLetters)}`,
    );
  };

  const anyBusy = isLoading || isRefreshing;

  return (
    <section className="bf-page bf-page--missing-characters">
      <header className="bf-page__header">
        <h1>BeeFont – Missing characters</h1>
        <p className="bf-page__subtitle">
          Inspect which characters are still missing for this language in the{' '}
          <strong>{formatLabel}</strong> default glyph set, and either create new
          glyphs directly in the editor or (for PNG) plan new template pages.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      <section className="bf-panel">
        <div className="bf-panel__header">
          <h2>Status</h2>

          {anyBusy && (
            <span className="bf-panel__status">
              {isLoading ? 'Loading… ' : ''}
              {isRefreshing ? 'Refreshing…' : ''}
            </span>
          )}
        </div>

        {status && (
          <dl className="bf-definition-list">
            <div className="bf-definition-list__row">
              <dt>Language</dt>
              <dd>{status.language}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Format</dt>
              <dd>{formatLabel}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Ready</dt>
              <dd>{status.ready ? 'yes' : 'no'}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Required characters</dt>
              <dd>{status.required_chars}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Missing count</dt>
              <dd>{status.missing_count}</dd>
            </div>
          </dl>
        )}

        {!status && !isLoading && !error && (
          <p>No status available for this job/language.</p>
        )}

        <div className="bf-panel__actions">
          <button
            type="button"
            className="bf-button bf-button--small"
            onClick={handleRefresh}
            disabled={anyBusy}
          >
            Refresh status ({formatLabel})
          </button>
        </div>
      </section>

      <section className="bf-panel">
        <h2>
          Missing characters ({formatLabel})
        </h2>

        {isLoading && missingCells.length === 0 && (
          <div className="bf-loading">
            Loading missing characters…
          </div>
        )}

        {!isLoading && missingCells.length === 0 && status && status.ready && (
          <p>
            This language is complete for{' '}
            <strong>{formatLabel}</strong> defaults. No characters
            are missing.
          </p>
        )}

        {!isLoading &&
          missingCells.length === 0 &&
          status &&
          !status.ready &&
          !status.missing_chars && (
            <p>
              Language is not ready for{' '}
              <strong>{formatLabel}</strong>, but the backend did
              not provide a list of missing characters.
            </p>
          )}

        {missingCells.length > 0 && (
          <AlphabetGrid
            title={`Missing characters (${formatLabel})`}
            items={missingCells}
          />
        )}

        <div className="bf-panel__actions">
          <button
            type="button"
            className="bf-button"
            onClick={handleCreateNextGlyph}
            disabled={missingCells.length === 0}
          >
            Create next glyph in editor ({formatLabel})
          </button>

          {effectiveFormat === 'png' && (
            <button
              type="button"
              className="bf-button bf-button--secondary"
              onClick={handlePlanPagesPng}
              disabled={missingCells.length === 0}
            >
              Create pages for all missing characters (PNG)
            </button>
          )}
        </div>
      </section>
    </section>
  );
};

export default MissingCharactersPage;

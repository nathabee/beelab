// src/pages/GlyphBrowserPage.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import useGlyphs from '@hooks/useGlyphs';
import useGlyphsZip, { type GlyphFormat } from '@hooks/useGlyphsZip';

import GlyphVariantsGrid from '@components/GlyphVariantsGrid';
import DefaultGlyphGrid from '@components/DefaultGlyphGrid';
import { useApp } from '@context/AppContext';

import { friendlyMessage, type AppError } from '@bee/common/error';

type ViewMode = 'variants' | 'defaults';

const GlyphBrowserPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1) Raw URL param
  const sidParam = searchParams.get('sid') ?? '';
  const initialLetter = searchParams.get('letter') ?? '';

  // 2) Active job from global context
  const { activeJob,activeGlyphFormat } = useApp();

  // 3) Effective sid: URL wins, otherwise fall back to activeJob
  const effectiveSid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  useEffect(() => {
    console.debug('[GlyphBrowserPage] SID resolution', {
      sidParam,
      activeJobSid: activeJob?.sid ?? null,
      effectiveSid,
    });
  }, [sidParam, activeJob, effectiveSid]);

  const [filterLetter, setFilterLetter] = useState<string>(initialLetter);

  // Scale of glyph thumbnails (1.0 = default)
  const [glyphScale, setGlyphScale] = useState<number>(1.0);

  // View mode – per-letter variants vs default overview
  const [viewMode, setViewMode] = useState<ViewMode>('variants');

  // Format used for ZIP import/export (not yet for the grids)
  // const [glyphFormat, setGlyphFormat] = useState<GlyphFormat>('png');

  const {
    glyphs,
    letter,
    isLoading,
    isUpdating,
    error,
    fetchGlyphs,
    selectDefault,
  } = useGlyphs(effectiveSid, {
    manual: false,
    initialLetter,
  });

  // ZIP import/export hook – now format-aware
  const {
    isDownloadingDefault,
    isDownloadingAll,
    isUploading,
    error: zipError,
    downloadDefaultZip,
    downloadAllZip,
    uploadGlyphsZip,
  } = useGlyphsZip(effectiveSid, activeGlyphFormat ); // glyphFormat);

  const errorText = useMemo(
    () => {
      const primary = error ? friendlyMessage(error as AppError) : null;
      const secondary = zipError ? friendlyMessage(zipError as AppError) : null;
      if (primary && secondary) return `${primary} / ${secondary}`;
      return primary || secondary;
    },
    [error, zipError],
  );

  useEffect(() => {
    // Keep local filter state in sync if query changes externally
    setFilterLetter(initialLetter);
  }, [initialLetter]);

  // Guard: now based on effectiveSid (URL or activeJob)
  if (!effectiveSid) {
    return (
      <section className="bf-page bf-page--glyph-browser">
        <header className="bf-page__header">
          <h1>BeeFont – Glyph browser</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen or select a job first.
        </div>
      </section>
    );
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = filterLetter.trim();
    fetchGlyphs({ letter: trimmed }).catch(err => {
      console.error('[GlyphBrowserPage] fetchGlyphs failed:', err);
    });

    const next = new URLSearchParams(searchParams);
    if (trimmed) next.set('letter', trimmed);
    else next.delete('letter');
    setSearchParams(next);
  };

  const handleClearFilter = () => {
    setFilterLetter('');
    fetchGlyphs({ letter: '' }).catch(err => {
      console.error('[GlyphBrowserPage] clear filter failed:', err);
    });
    const next = new URLSearchParams(searchParams);
    next.delete('letter');
    setSearchParams(next);
  };

  const handleSetDefault = (letterParam: string, glyphId: number) => {
    selectDefault(letterParam, { glyph_id: glyphId }).catch(err => {
      console.error('[GlyphBrowserPage] selectDefault failed:', err);
    });
  };

  const clampScale = (value: number) => {
    const min = 0.5;
    const max = 3.0;
    return Math.min(max, Math.max(min, value));
  };

  const handleZoomOut = () => {
    setGlyphScale(prev => clampScale(prev - 0.25));
  };

  const handleZoomIn = () => {
    setGlyphScale(prev => clampScale(prev + 0.25));
  };

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlyphScale(clampScale(parseFloat(e.target.value)));
  };

  // Default-glyph subset for the overview
  const defaultGlyphs = useMemo(
    () => glyphs.filter(g => g.is_default),
    [glyphs],
  );

  // Optional: when clicking a glyph in default overview,
  // jump back to variants view for that letter.
  const handleDefaultGlyphClick = (letterParam: string) => {
    setViewMode('variants');
    setFilterLetter(letterParam);
    fetchGlyphs({ letter: letterParam }).catch(err => {
      console.error('[GlyphBrowserPage] fetchGlyphs(letter) failed:', err);
    });
    const next = new URLSearchParams(searchParams);
    if (letterParam) next.set('letter', letterParam);
    else next.delete('letter');
    setSearchParams(next);
  };

  const renderSizeControls = () => (
    <div className="bf-glyph-browser__controls">
      <span className="bf-glyph-browser__controls-label">Size</span>
      <button
        type="button"
        className="bf-button bf-button--tiny"
        onClick={handleZoomOut}
      >
        –
      </button>
      <input
        type="range"
        min={0.5}
        max={3.0}
        step={0.25}
        value={glyphScale}
        onChange={handleZoomSlider}
        className="bf-glyph-browser__slider"
      />
      <button
        type="button"
        className="bf-button bf-button--tiny"
        onClick={handleZoomIn}
      >
        +
      </button>
    </div>
  );

  const anyZipBusy = isDownloadingDefault || isDownloadingAll || isUploading;

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again if needed
    e.target.value = '';

    const ok = window.confirm(
      `Upload ${activeGlyphFormat.toUpperCase()} glyph ZIP for this job? Existing glyph variants will be kept; new files will be added with new indices.`,
    );
    if (!ok) return;

    uploadGlyphsZip(file)
      .then(() => {
        // Refresh current view after upload
        const currentLetter = filterLetter.trim();
        return fetchGlyphs({ letter: currentLetter });
      })
      .catch(err => {
        console.error('[GlyphBrowserPage] uploadGlyphsZip failed:', err);
      });
  };

  return (
    <section className="bf-page bf-page--glyph-browser">
      <header className="bf-page__header">
        <h1>BeeFont – Glyph browser</h1>
        <p className="bf-page__subtitle">
          Inspect glyph variants and choose defaults, or see all default glyphs in a compact grid.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {/* ZIP import/export tools */}
      <section className="bf-panel bf-panel--compact">
        <div className="bf-panel__header">
          <h2>Glyph ZIP tools</h2>

          <div className="bf-toggle bf-toggle--compact">
            <span className="bf-glyph-browser__controls-label">
              Format
            </span>
            {/* <button
              type="button"
              className={
                'bf-button bf-button--tiny' +
                (glyphFormat === 'png' ? ' bf-button--primary' : '')
              }
              onClick={() => setGlyphFormat('png')}
              disabled={anyZipBusy}
            >
              PNG
            </button>
            <button
              type="button"
              className={
                'bf-button bf-button--tiny' +
                (glyphFormat === 'svg' ? ' bf-button--primary' : '')
              }
              onClick={() => setGlyphFormat('svg')}
              disabled={anyZipBusy}
            >
              SVG
            </button> */}
          </div>

          {anyZipBusy && (
            <span className="bf-panel__status">
              {isDownloadingDefault && 'Downloading default glyphs… '}
              {isDownloadingAll && 'Downloading all glyphs… '}
              {isUploading && 'Uploading glyph ZIP…'}
            </span>
          )}
        </div>

        <div className="bf-panel__actions">
          <button
            type="button"
            className="bf-button bf-button--small"
            onClick={downloadDefaultZip}
            disabled={anyZipBusy}
          >
            Download default glyphs ({activeGlyphFormat.toUpperCase()}) ZIP
          </button>
          <button
            type="button"
            className="bf-button bf-button--small"
            onClick={downloadAllZip}
            disabled={anyZipBusy}
          >
            Download all glyphs ({activeGlyphFormat.toUpperCase()}) ZIP
          </button>

          <label className="bf-button bf-button--small">
            Upload glyph ZIP ({activeGlyphFormat.toUpperCase()})…
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={handleUploadChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <p className="bf-panel__hint">
          {activeGlyphFormat === 'png' ? (
            <>
              Download the PNG glyphs for external editing, then upload a ZIP with PNGs named
              like <code>A.png</code> or <code>A_v2.png</code>. Each file will be imported
              as a new variant <code>LETTER_v&lt;j&gt;.png</code> for this job.
            </>
          ) : (
            <>
              Download the SVG glyphs for external editing, then upload a ZIP with SVGs named
              like <code>A.svg</code> or <code>A_v2.svg</code>. Each file will be imported
              as a new variant <code>LETTER_v&lt;j&gt;.svg</code> for this job.
            </>
          )}
        </p>
      </section>

      {/* View mode toggle */}
      <section className="bf-panel bf-panel--compact">
        <div className="bf-panel__header">
          <h2>View</h2>
          <div className="bf-toggle">
            <button
              type="button"
              className={
                'bf-button bf-button--small' +
                (viewMode === 'variants' ? ' bf-button--primary' : '')
              }
              onClick={() => setViewMode('variants')}
            >
              Glyph variants
            </button>
            <button
              type="button"
              className={
                'bf-button bf-button--small' +
                (viewMode === 'defaults' ? ' bf-button--primary' : '')
              }
              onClick={() => setViewMode('defaults')}
            >
              Default overview
            </button>
          </div>
        </div>
      </section>

      {/* Variants mode: filter + variants grid */}
      {viewMode === 'variants' && (
        <>
          <section className="bf-panel">
            <h2>Filter</h2>
            <form
              onSubmit={handleFilterSubmit}
              className="bf-form bf-form--inline"
            >
              <label htmlFor="glyph-filter-letter">
                Letter
              </label>
              <input
                id="glyph-filter-letter"
                type="text"
                maxLength={1}
                value={filterLetter}
                onChange={e => setFilterLetter(e.target.value)}
                className="bf-input bf-input--small"
                placeholder="A"
              />
              <button
                type="submit"
                className="bf-button bf-button--small"
                disabled={isLoading}
              >
                Apply
              </button>
              <button
                type="button"
                className="bf-button bf-button--small"
                onClick={handleClearFilter}
                disabled={isLoading && !letter}
              >
                Clear
              </button>
            </form>
            <p className="bf-panel__hint">
              Current filter:{' '}
              {letter ? <strong>{letter}</strong> : 'all letters'}
            </p>
          </section>

          <section className="bf-panel">
            <div className="bf-panel__header">
              <h2>Glyph variants</h2>

              {renderSizeControls()}

              {(isLoading || isUpdating) && (
                <span className="bf-panel__status">
                  {isLoading ? 'Loading… ' : ''}
                  {isUpdating ? 'Updating…' : ''}
                </span>
              )}
            </div>

            {isLoading && glyphs.length === 0 && (
              <div className="bf-loading">
                Loading glyphs…
              </div>
            )}

            {!isLoading && glyphs.length === 0 && !error && (
              <p>No glyphs available for this job yet.</p>
            )}

            {glyphs.length > 0 && (
              <GlyphVariantsGrid
                glyphs={glyphs}
                onSetDefault={handleSetDefault}
                scale={glyphScale}
              />
            )}
          </section>
        </>
      )}

      {/* Default overview mode: compact grid of default glyphs only */}
      {viewMode === 'defaults' && (
        <section className="bf-panel">
          <div className="bf-panel__header">
            <h2>Default glyph overview</h2>

            {renderSizeControls()}

            {(isLoading || isUpdating) && (
              <span className="bf-panel__status">
                {isLoading ? 'Loading… ' : ''}
                {isUpdating ? 'Updating…' : ''}
              </span>
            )}
          </div>

          {isLoading && defaultGlyphs.length === 0 && (
            <div className="bf-loading">
              Loading default glyphs…
            </div>
          )}

          {!isLoading && defaultGlyphs.length === 0 && !error && (
            <p>No default glyphs set yet. Use the variants view to select defaults.</p>
          )}

          {defaultGlyphs.length > 0 && (
            <DefaultGlyphGrid
              glyphs={defaultGlyphs}
              scale={glyphScale}
              onGlyphClick={handleDefaultGlyphClick}
            />
          )}
        </section>
      )}
    </section>
  );
};

export default GlyphBrowserPage;

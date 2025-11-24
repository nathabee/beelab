'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import useGlyphs from '@hooks/useGlyphs';
import GlyphVariantsGrid from '@components/GlyphVariantsGrid';
import { useApp } from '@context/AppContext';

import { friendlyMessage, type AppError } from '@bee/common/error';

const GlyphBrowserPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1) Raw URL param
  const sidParam = searchParams.get('sid') ?? '';
  const initialLetter = searchParams.get('letter') ?? '';

  // 2) Active job from global context
  const { activeJob } = useApp();

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

  // NEW: scale of glyph thumbnails (1.0 = default)
  const [glyphScale, setGlyphScale] = useState<number>(1.0);

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

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
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

  // NEW: helpers for +/– and slider
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

  return (
    <section className="bf-page bf-page--glyph-browser">
      <header className="bf-page__header">
        <h1>BeeFont – Glyph browser</h1>
        <p className="bf-page__subtitle">
          Inspect all glyphs for this job and choose which variant is the default for each letter.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

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

          {/* NEW: glyph size controls */}
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
    </section>
  );
};

export default GlyphBrowserPage;

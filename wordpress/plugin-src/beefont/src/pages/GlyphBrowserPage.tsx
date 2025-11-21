// src/pages/GlyphBrowserPage.tsx
//
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import useGlyphs from '@hooks/useGlyphs';
import GlyphVariantsGrid from '@components/GlyphVariantsGrid';

import { friendlyMessage, type AppError } from '@bee/common/error';

const GlyphBrowserPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const sid = searchParams.get('sid') ?? '';
  const initialLetter = searchParams.get('letter') ?? '';

  const [filterLetter, setFilterLetter] = useState<string>(initialLetter);

  const {
    glyphs,
    letter,
    isLoading,
    isUpdating,
    error,
    fetchGlyphs,
    selectDefault,
  } = useGlyphs(sid || '', {
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

  if (!sid) {
    return (
      <section className="bf-page bf-page--glyph-browser">
        <header className="bf-page__header">
          <h1>BeeFont – Glyph browser</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen.
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
          />
        )}
      </section>
    </section>
  );
};

export default GlyphBrowserPage;

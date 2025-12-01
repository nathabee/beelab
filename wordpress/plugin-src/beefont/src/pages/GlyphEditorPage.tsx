// src/pages/GlyphEditorPage.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApp } from '@context/AppContext';

import PngGlyphEditor from '@components/PngGlyphEditor';
import SvgGlyphEditor from '@components/SvgGlyphEditor/SvgGlyphEditor';

const GlyphEditorPage: React.FC = () => { 
  const [searchParams] = useSearchParams();
  const initialLetter = searchParams.get('letter') ?? '';
  const variantParam = searchParams.get('variant');
  const initialVariantIndex = (() => {
    if (!variantParam) return undefined;
    const n = parseInt(variantParam, 10);
    return Number.isNaN(n) ? undefined : n;
  })();

  const { activeJob, activeGlyphFormat } = useApp();

  const effectiveSid = useMemo(
    () => activeJob?.sid || '',
    [activeJob],
  );

  const [letter, setLetter] = useState<string>(initialLetter);

  useEffect(() => {
    setLetter(initialLetter);
  }, [initialLetter]);

  if (!effectiveSid) {
    return (
      <section className="bf-page bf-page--glyph-editor">
        <header className="bf-page__header">
          <h1>BeeFont – Glyph editor</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from a job or select a job first.
        </div>
      </section>
    );
  }

  const modeLabel = activeGlyphFormat.toUpperCase();

  return (
    <section className="bf-page bf-page--glyph-editor">
      <header className="bf-page__header">
        <h1>BeeFont – Glyph editor</h1>
        <p className="bf-page__subtitle">
          Draw a glyph by hand and save it as a new variant. The editor mode is
          controlled by the global setting in the job overview (currently{' '}
          <strong>{modeLabel}</strong>).
        </p>
      </header>

      {/* Mode info (switch is in JobOverview) */}
      <section className="bf-panel">
        <h2>Editor mode</h2>
        <p className="bf-panel__hint">
          Active glyph format: <strong>{modeLabel}</strong>. Change this in the
          job overview if you want to switch between bitmap (PNG) and vector (SVG).
        </p>
      </section>

      {/* Shared glyph settings */}
      <section className="bf-panel">
        <h2>Glyph settings</h2>
        <div className="bf-form bf-form--inline">
          <label htmlFor="glyph-letter">
            Letter / character
          </label>
          <input
            id="glyph-letter"
            type="text"
            maxLength={2}
            value={letter}
            onChange={e => setLetter(e.target.value)}
            className="bf-input bf-input--small"
            placeholder="A"
          />
        </div>
      </section>

      {/* Mode-specific editors */}
      {activeGlyphFormat === 'png' ? (
        <PngGlyphEditor sid={effectiveSid} letter={letter} />
      ) : (
        <SvgGlyphEditor
          sid={effectiveSid}
          letter={letter}
          variantIndex={initialVariantIndex}
        />
      )}

    </section>
  );
};

export default GlyphEditorPage;

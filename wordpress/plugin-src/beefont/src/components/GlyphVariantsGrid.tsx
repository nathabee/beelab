'use client';

// src/components/GlyphVariantsGrid.tsx

import React, { useMemo, CSSProperties } from 'react';
import type { Glyph } from '@mytypes/glyph';
import { buildMediaUrl } from '@utils/api';

export type GlyphVariantsGridProps = {
  glyphs: Glyph[];
  /**
   * Called when the user wants to set this glyph as default for its letter.
   */
  onSetDefault?: (letter: string, glyphId: number) => void;

  /**
   * Thumbnail scale factor, coming from the glyph browser page.
   * 1.0 = base size, 0.5 = smaller, 2.0 = larger, etc.
   */
  scale?: number;
};

const GlyphVariantsGrid: React.FC<GlyphVariantsGridProps> = ({
  glyphs,
  onSetDefault,
  scale = 1.0,
}) => {
  if (!glyphs || glyphs.length === 0) {
    return <p>No glyphs available.</p>;
  }

  const grouped = useMemo(() => {
    const acc: Record<string, Glyph[]> = {};
    glyphs.forEach(g => {
      if (!acc[g.letter]) acc[g.letter] = [];
      acc[g.letter].push(g);
    });
    return acc;
  }, [glyphs]);

  // We expose the scale as a CSS variable; CSS will handle actual pixel size.
  const rootStyle: CSSProperties = {
    // custom property, consumed in SCSS/CSS
    '--bf-glyph-scale': scale,
  } as CSSProperties;

  return (
    <div className="bf-glyph-browser" style={rootStyle}>
      {Object.entries(grouped).map(([letter, variants]) => (
        <section key={letter} className="bf-glyph-browser__group">
          <h3 className="bf-glyph-browser__group-title">{letter}</h3>
          <div className="bf-glyph-browser__grid">
            {variants.map(glyph => (
              <figure
                key={glyph.id}
                className={
                  'bf-glyph-browser__item' +
                  (glyph.is_default
                    ? ' bf-glyph-browser__item--default'
                    : '')
                }
              >
                <div className="bf-glyph-browser__thumb">
                  <img
                    src={buildMediaUrl(glyph.image_path)}
                    alt={`Glyph ${glyph.letter} (#${glyph.variant_index})`}
                  />
                </div>

                <figcaption className="bf-glyph-browser__caption">
                  <div className="bf-glyph-browser__meta">
                    Variant #{glyph.variant_index} · Cell {glyph.cell_index}
                  </div>
                  {onSetDefault && (
                    <button
                      type="button"
                      className="bf-button bf-button--tiny"
                      disabled={glyph.is_default}
                      onClick={() => onSetDefault(letter, glyph.id)}
                    >
                      {glyph.is_default ? 'Default' : 'Set as default'}
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default GlyphVariantsGrid;

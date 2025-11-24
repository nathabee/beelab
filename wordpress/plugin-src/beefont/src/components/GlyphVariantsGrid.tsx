'use client';

// src/components/GlyphVariantsGrid.tsx

import React, { useMemo } from 'react';
import type { Glyph } from '@mytypes/glyph';
import { buildMediaUrl } from '@utils/api';

export type GlyphVariantsGridProps = {
  glyphs: Glyph[];

  /**
   * Called when the user wants to set this glyph as default for its letter.
   */
  onSetDefault?: (letter: string, glyphId: number) => void;
};

const GlyphVariantsGrid: React.FC<GlyphVariantsGridProps> = ({
  glyphs,
  onSetDefault,
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

  return (
    <div className="bf-glyph-browser">
      {Object.entries(grouped).map(([letter, variants]) => (
        <section key={letter} className="bf-glyph-browser__group">
          <h3>{letter}</h3>
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
                <img
                  src={buildMediaUrl(glyph.image_path)}
                  alt={`Glyph ${glyph.letter} (#${glyph.variant_index})`}
                /> 

                <figcaption>
                  <div className="bf-glyph-browser__meta">
                    Variant #{glyph.variant_index} · Cell {glyph.cell_index}
                  </div>
                  {onSetDefault && (
                    <button
                      type="button"
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

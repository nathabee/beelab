// src/components/GlyphVariantsGrid.tsx
'use client';

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

  /**
   * Optional callback to delete a glyph variant.
   * If not provided, no Delete button is rendered.
   */
  onDelete?: (glyphId: number, letter: string) => void;

  /**
   * Optional callback to edit a glyph variant.
   * If not provided, no Edit button is rendered.
   */
  onEdit?: (
    glyphId: number,
    letter: string,
    variantIndex: number,
  ) => void;
};

const GlyphVariantsGrid: React.FC<GlyphVariantsGridProps> = ({
  glyphs,
  onSetDefault,
  scale = 1.0,
  onDelete,
  onEdit,
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

  const rootStyle: CSSProperties = {
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

                  <div className="bf-glyph-browser__actions">
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

                    {onEdit && (
                      <button
                        type="button"
                        className="bf-button bf-button--tiny"
                        onClick={() =>
                          onEdit(
                            glyph.id,
                            glyph.letter,
                            glyph.variant_index,
                          )
                        }
                      >
                        Edit
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        className="bf-button bf-button--tiny bf-button--danger"
                        onClick={() => onDelete(glyph.id, glyph.letter)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
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

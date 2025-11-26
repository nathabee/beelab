'use client';

// src/components/DefaultGlyphGrid.tsx

import React, { CSSProperties, useMemo } from 'react';
import type { Glyph } from '@mytypes/glyph';
import { buildMediaUrl } from '@utils/api';

export type DefaultGlyphGridProps = {
  glyphs: Glyph[];
  /**
   * Global scale factor for thumbnails (same as in GlyphBrowserPage).
   */
  scale?: number;

  /**
   * Optional: when user clicks a glyph, e.g. to jump to the variants view for that letter.
   */
  onGlyphClick?: (letter: string) => void;
};

const DefaultGlyphGrid: React.FC<DefaultGlyphGridProps> = ({
  glyphs,
  scale = 1.0,
  onGlyphClick,
}) => {
  // Only keep default glyphs
  const defaults = useMemo(
    () => (glyphs || []).filter(g => g.is_default),
    [glyphs],
  );

  if (!defaults.length) {
    return <p>No default glyphs set for this job yet.</p>;
  }

  // Sort by letter (and then by variant_index just to keep it stable)
  const sorted = useMemo(
    () =>
      [...defaults].sort((a, b) => {
        if (a.letter === b.letter) {
          return a.variant_index - b.variant_index;
        }
        return a.letter.localeCompare(b.letter, 'en');
      }),
    [defaults],
  );

  // Expose scale as CSS variable so CSS can decide cell size and grid density.
  const rootStyle: CSSProperties = {
    '--bf-glyph-scale': scale,
  } as CSSProperties;

  return (
    <div className="bf-default-glyph-grid" style={rootStyle}>
      {sorted.map(glyph => {
        const handleClick = () => {
          if (onGlyphClick) onGlyphClick(glyph.letter);
        };

        return (
          <figure
            key={glyph.id}
            className="bf-default-glyph-grid__item"
            onClick={handleClick}
          >
            <div className="bf-default-glyph-grid__thumb">
              <img
                src={buildMediaUrl(glyph.image_path)}
                alt={`Default glyph ${glyph.letter}`}
              />
            </div>
            <figcaption className="bf-default-glyph-grid__caption">
              {glyph.letter}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
};

export default DefaultGlyphGrid;

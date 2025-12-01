// src/utils/svgSkeleton.ts

import type {
  Point,
  Stroke,
  GlyphMetricProfile,
  GlyphSkeletonAnchor,
  GlyphSkeletonStrokeDef,
} from '@mytypes/glyphEditor';
import { DEFAULT_GLYPH_METRIC } from '@mytypes/glyphEditor';
import { GLYPH_SKELETONS, GLYPH_METRICS } from '@mytypes/glyphSkeletons';
import { distance } from './svgGeometry';

/**
 * Return metric profile for a given letter, with sensible fallback.
 */
export function getGlyphMetric(rawLetter: string): GlyphMetricProfile {
  const ch = rawLetter || 'A';

  return (
    GLYPH_METRICS[ch] ||
    GLYPH_METRICS[ch.toUpperCase()] ||
    GLYPH_METRICS[ch.toLowerCase()] ||
    DEFAULT_GLYPH_METRIC
  );
}

/**
 * Map a skeleton anchor (majuscule/xheight/baseline/…) to an actual Y coordinate.
 */
export function mapSkeletonY(
  anchor: GlyphSkeletonAnchor,
  geom: {
    majusculeY: number;
    ascenderY: number;
    xHeightY: number;
    baselineY: number;
    descenderY: number;
  },
): number {
  const { majusculeY, ascenderY, xHeightY, baselineY, descenderY } = geom;

  switch (anchor) {
    case 'majuscule':
      return majusculeY;
    case 'ascender':
      return ascenderY;
    case 'xheight':
      // note: skeleton type is 'xheight' (lowercase h),
      // but we store the numeric coordinate as xHeightY
      return xHeightY;
    case 'baseline':
      return baselineY;
    case 'descender':
      return descenderY;
  }
}

/**
 * Helper to approximate a circle with multiple straight segments.
 */
export function createCircleStrokes(
  center: Point,
  edgePoint: Point,
  baseWidth: number,
): Stroke[] {
  const r = distance(center, edgePoint);
  if (!Number.isFinite(r) || r <= 0) return [];

  const segments = 24; // same “reasonable smoothness” as before
  const strokes: Stroke[] = [];
  const now = Date.now();

  for (let i = 0; i < segments; i++) {
    const t0 = (i / segments) * 2 * Math.PI;
    const t1 = ((i + 1) / segments) * 2 * Math.PI;

    const p0: Point = {
      x: center.x + r * Math.cos(t0),
      y: center.y + r * Math.sin(t0),
    };
    const p1: Point = {
      x: center.x + r * Math.cos(t1),
      y: center.y + r * Math.sin(t1),
    };

    strokes.push({
      id: `stroke-circle-${now}-${i}`,
      p0,
      p1,
      width: baseWidth,
    });
  }

  return strokes;
}

/**
 * Build concrete strokes for the given letter based on its skeleton definition
 * and the current glyph geometry (ink box + handwriting lines).
 *
 * If no skeleton is defined → generic circle-like fallback.
 */
export function createLetterSkeletonStrokes(
  glyphLetter: string,
  geom: {
    glyphXMin: number;
    glyphXMax: number;
    majusculeY: number;
    ascenderY: number;
    xHeightY: number;
    baselineY: number;
    descenderY: number;
  },
  baseWidth: number,
): Stroke[] {
  const ch = glyphLetter || 'A';
  const upperKey = ch.toUpperCase();
  const lowerKey = ch.toLowerCase();

  const def =
    GLYPH_SKELETONS[ch] ||
    GLYPH_SKELETONS[upperKey] ||
    GLYPH_SKELETONS[lowerKey];

  const {
    glyphXMin,
    glyphXMax,
    majusculeY,
    ascenderY,
    xHeightY,
    baselineY,
    descenderY,
  } = geom;

  const glyphWidth = glyphXMax - glyphXMin;

  // If we have a skeleton definition → map it to strokes
  if (def) {
    const now = Date.now();

    const strokes: Stroke[] = def.strokes.map(
      (s: GlyphSkeletonStrokeDef, idx: number) => {
        const fromX = glyphXMin + s.from.x * glyphWidth;
        const toX = glyphXMin + s.to.x * glyphWidth;

        const fromY = mapSkeletonY(s.from.y, {
          majusculeY,
          ascenderY,
          xHeightY,
          baselineY,
          descenderY,
        });
        const toY = mapSkeletonY(s.to.y, {
          majusculeY,
          ascenderY,
          xHeightY,
          baselineY,
          descenderY,
        });

        return {
          id: `stroke-letter-${upperKey}-${now}-${idx}`,
          p0: { x: fromX, y: fromY },
          p1: { x: toX, y: toY },
          width: baseWidth,
        };
      },
    );

    return strokes;
  }

  // Fallback: generic O-like circle skeleton
  const center: Point = {
    x: (glyphXMin + glyphXMax) / 2,
    y: (ascenderY + baselineY) / 2,
  };
  const radius = (baselineY - ascenderY) / 2;
  const edge: Point = {
    x: center.x + radius,
    y: center.y,
  };

  return createCircleStrokes(center, edge, baseWidth);
}

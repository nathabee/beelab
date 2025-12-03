// src/utils/svg/svgSkeleton.ts

import { parseSvgToStrokes } from '@utils/svg/svgSerialization';

import {
  DEFAULT_SVG_CANVAS_WIDTH,
  DEFAULT_SVG_CANVAS_HEIGHT,
  DEFAULT_GLYPH_METRIC,
  type FontLineFactors,
  type Point,
  type Stroke,
  type GlyphMetricProfile,
  type GlyphSkeletonAnchor,
  type GlyphSkeletonDef,
} from '@mytypes/glyphEditor';

import {
  GLYPH_METRICS,
  GLYPH_SKELETONS,
  GLYPH_SKELETON_SVGS,
} from '@mytypes/glyphSkeletons';

// ---------------------------------------------------------------------------
// viewBox helpers for raw SVG skeletons
// ---------------------------------------------------------------------------

type SkeletonViewBox = {
  left: number;
  right: number;
};

/**
 * Extract "viewBox" metadata from a raw skeleton snippet, if present.
 *
 * We expect: viewBox="minX minY width height"
 * and convert it to left/right in editor coordinates (0..600).
 */
function extractSkeletonViewBox(raw: string): SkeletonViewBox | null {
  const m = raw.match(
    /viewBox\s*=\s*"([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)\s+([0-9.+-]+)"/,
  );
  if (!m) return null;

  const minX = parseFloat(m[1]);
  const width = parseFloat(m[3]);
  if (!Number.isFinite(minX) || !Number.isFinite(width) || width <= 0) {
    return null;
  }

  const left = minX;
  const right = minX + width;
  return { left, right };
}

/**
 * Remove any `viewBox="..."` token from the raw snippet so we can safely
 * wrap it in our own <svg> element.
 */
function stripSkeletonViewBox(raw: string): string {
  return raw.replace(
    /viewBox\s*=\s*"[0-9.+-]+\s+[0-9.+-]+\s+[0-9.+-]+\s+[0-9.+-]+"/,
    '',
  );
}

/**
 * Public helper: default horizontal ink box for a given letter, in
 * canvas coordinates (0..canvasWidth).
 *
 * Priority:
 *  1) ViewBox metadata from GLYPH_SKELETON_SVGS if present
 *  2) GLYPH_METRICS factors → left/right in pixels
 *  3) Fallback: basic DEFAULT_GLYPH_METRIC
 */
export function getDefaultHorizontalBoxForLetter(
  letter: string,
  canvasWidth: number = DEFAULT_SVG_CANVAS_WIDTH,
): SkeletonViewBox {
  const ch = (letter || 'A').charAt(0);

  const raw = GLYPH_SKELETON_SVGS[ch];
  if (raw) {
    const vb = extractSkeletonViewBox(raw);
    if (vb) {
      return {
        left: Math.max(0, Math.min(canvasWidth, vb.left)),
        right: Math.max(
          1,
          Math.min(canvasWidth, vb.right),
        ),
      };
    }
  }

  const metric = getGlyphMetric(ch);
  const leftPx = metric.leftSideBearingFactor * canvasWidth;
  const rightPx =
    (metric.leftSideBearingFactor + metric.advanceWidthFactor) *
    canvasWidth;

  return {
    left: leftPx,
    right: rightPx,
  };
}

// ---------------------------------------------------------------------------
// Layout types
// ---------------------------------------------------------------------------

export type GlyphBoxLayout = {
  glyphXMin: number;
  glyphXMax: number;
  glyphWidth: number;

  baselineY: number;
  xHeightY: number;
  ascenderY: number;
  capHeightY: number;
  descenderY: number;
};

// (anchorToY, getGlyphMetric, computeGlyphBoxLayout, createCircleStrokes unchanged)

// ---------------------------------------------------------------------------
// Skeleton → concrete strokes (raw SVG version)
// ---------------------------------------------------------------------------

export function createLetterSkeletonStrokes(
  letter: string,
  _layout: GlyphBoxLayout,
  defaultWidth: number,
): Stroke[] {
  const raw = GLYPH_SKELETON_SVGS[letter];
  if (!raw) {
    // no default SVG for this letter → no skeleton
    return [];
  }

  const cleaned = stripSkeletonViewBox(raw);

  // Wrap the snippet into a full SVG so the parser is happy.
  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 ${DEFAULT_SVG_CANVAS_WIDTH} ${DEFAULT_SVG_CANVAS_HEIGHT}">
      ${cleaned}
    </svg>
  `;

  const parsed = parseSvgToStrokes(fullSvg);
  const baseTime = Date.now();

  const strokes: Stroke[] = parsed.map((s, idx) => ({
    id: `skel-${letter}-${baseTime}-${idx}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    p0: { ...s.p0 },
    p1: { ...s.p1 },
    ctrl: s.ctrl ? { ...s.ctrl } : undefined,
    width: s.width && s.width > 0 ? s.width : defaultWidth,
  }));

  return strokes;
}

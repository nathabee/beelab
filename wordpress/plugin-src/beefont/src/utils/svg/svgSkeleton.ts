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
 * and convert it to left/right in editor coordinates (0..canvasWidth).
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
// Metrics helpers
// ---------------------------------------------------------------------------

/**
 * Return the metric profile for a given letter, with sensible fallback.
 */
export function getGlyphMetric(letterRaw: string): GlyphMetricProfile {
  const ch = (letterRaw || 'A').charAt(0);
  const exact = GLYPH_METRICS[ch];
  if (exact) return exact;

  const upper = GLYPH_METRICS[ch.toUpperCase()];
  if (upper) return upper;

  const lower = GLYPH_METRICS[ch.toLowerCase()];
  if (lower) return lower;

  return DEFAULT_GLYPH_METRIC;
}

/**
 * Compute the ink box placement and key line positions for a glyph
 * inside the editor canvas.
 *
 * - canvasWidth/canvasHeight: full SVG canvas size
 * - metric: per-letter width + side bearing
 * - lineFactors: global font grid (capHeight/xHeight/ascender/descender)
 */
export function computeGlyphBoxLayout(
  canvasWidth: number,
  canvasHeight: number,
  metric: GlyphMetricProfile,
  lineFactors: FontLineFactors,
): GlyphBoxLayout {
  const width = canvasWidth || DEFAULT_SVG_CANVAS_WIDTH;
  const height = canvasHeight || DEFAULT_SVG_CANVAS_HEIGHT;

  const marginTop = height * 0.10;
  const marginBottom = height * 0.10;

  const baselineY = height - marginBottom;
  const mainBand = baselineY - marginTop;

  const xHeightY =
    baselineY - mainBand * lineFactors.xHeight;
  const ascenderY =
    baselineY - mainBand * lineFactors.ascender;
  const capHeightY =
    baselineY - mainBand * lineFactors.capHeight;
  const descenderY =
    baselineY + mainBand * lineFactors.descender;

  const glyphWidth =
    metric.advanceWidthFactor * width;
  const glyphXMin =
    metric.leftSideBearingFactor * width;
  const glyphXMax = glyphXMin + glyphWidth;

  return {
    glyphXMin,
    glyphXMax,
    glyphWidth,
    baselineY,
    xHeightY,
    ascenderY,
    capHeightY,
    descenderY,
  };
}

// ---------------------------------------------------------------------------
// Circle helper (used in fallback skeletons and "circle" tool)
// ---------------------------------------------------------------------------

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Approximate a circle by multiple straight strokes.
 * Used both as a drawing tool and as a fallback skeleton shape.
 */
export function createCircleStrokes(
  center: Point,
  edgePoint: Point,
  baseWidth: number,
): Stroke[] {
  const r = distance(center, edgePoint);
  if (!Number.isFinite(r) || r <= 0) return [];

  const segments = 24;
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

// ---------------------------------------------------------------------------
// Skeleton → concrete strokes (anchor-based OLD version)
// ---------------------------------------------------------------------------

/**
 * Map a skeleton anchor (capHeight/xHeight/…) to an absolute Y,
 * using the layout from computeGlyphBoxLayout.
 */
function anchorToY(
  anchor: GlyphSkeletonAnchor,
  layout: GlyphBoxLayout,
): number {
  const {
    capHeightY,
    ascenderY,
    xHeightY,
    baselineY,
    descenderY,
  } = layout;

  switch (anchor) {
    case 'capHeight':
      return capHeightY;
    case 'ascender':
      return ascenderY;
    case 'xHeight':
      return xHeightY;
    case 'baseline':
      return baselineY;
    case 'descender':
      return descenderY;
  }
}

/**
 * Old skeleton system based on GlyphSkeletonDef (relative 0..1 + anchors).
 * Keep it exported in case other code still uses it.
 */
export function createLetterSkeletonStrokes_old(
  glyphLetter: string,
  layout: GlyphBoxLayout,
  baseWidth: number,
): Stroke[] {
  const ch = glyphLetter || 'A';
  const keyUpper = ch.toUpperCase();
  const keyLower = ch.toLowerCase();

  const def: GlyphSkeletonDef | undefined =
    GLYPH_SKELETONS[ch] ||
    GLYPH_SKELETONS[keyUpper] ||
    GLYPH_SKELETONS[keyLower];

  const {
    glyphXMin,
    glyphXMax,
    baselineY,
    xHeightY,
    ascenderY,
    capHeightY,
    descenderY,
  } = layout;

  const glyphWidth = glyphXMax - glyphXMin;

  if (def) {
    const now = Date.now();

    return def.strokes.map((s, idx): Stroke => {
      const fromX = glyphXMin + s.from.x * glyphWidth;
      const toX = glyphXMin + s.to.x * glyphWidth;

      const fromY = anchorToY(s.from.y, {
        glyphXMin,
        glyphXMax,
        glyphWidth,
        baselineY,
        xHeightY,
        ascenderY,
        capHeightY,
        descenderY,
      });
      const toY = anchorToY(s.to.y, {
        glyphXMin,
        glyphXMax,
        glyphWidth,
        baselineY,
        xHeightY,
        ascenderY,
        capHeightY,
        descenderY,
      });

      return {
        id: `stroke-letter-${keyUpper}-${now}-${idx}`,
        p0: { x: fromX, y: fromY },
        p1: { x: toX, y: toY },
        width: baseWidth,
      };
    });
  }

  // Fallback: simple circle-ish skeleton in the main band
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

// ---------------------------------------------------------------------------
// Skeleton → concrete strokes (raw SVG + viewBox metadata NEW version)
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

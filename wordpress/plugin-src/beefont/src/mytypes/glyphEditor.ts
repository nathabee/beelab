// src/mytypes/glyphEditor.ts

// ---------------------------------------------------------------------------
// Canvas + editor geometry
// ---------------------------------------------------------------------------

/**
 * Default canvas size for the SvgGlyphEditor.
 * The editor components can import this instead of hard-coding 600.
 */
export const DEFAULT_SVG_CANVAS_WIDTH = 600;
export const DEFAULT_SVG_CANVAS_HEIGHT = 600;

/**
 * Simple 2D point in canvas space.
 */
export type Point = {
  x: number;
  y: number;
};

/**
 * One drawable stroke in the editor.
 *
 * - If `ctrl` is present → quadratic Bézier ("M p0 Q ctrl p1").
 * - If `ctrl` is absent  → straight line between p0 and p1.
 */
export type Stroke = {
  id: string;
  p0: Point;
  p1: Point;
  ctrl?: Point;
  width: number;
};

/**
 * Logical group of strokes that should move/scale together.
 */
export type StrokeGroup = {
  id: string;
  strokeIds: string[];
};

/**
 * Drawing / interaction mode for the SVG canvas.
 */
export type DrawMode = 'stroke' | 'circle' | 'select';

// ---------------------------------------------------------------------------
// Global vertical font lines (for the whole job/font)
// ---------------------------------------------------------------------------

/**
 * Typographic vertical lines the editor cares about.
 *
 * capHeight  – top of capitals (what used to be "majuscule")
 * ascender   – tall lowercase stems (h, l, k, b, d…)
 * xHeight    – body of lowercase (x, a, e…)
 * baseline   – writing baseline
 * descender  – tails below baseline (p, q, g, y, j…)
 */
export type FontLineKey =
  | 'capHeight'
  | 'ascender'
  | 'xHeight'
  | 'baseline'
  | 'descender';

/**
 * Relative positions of the key lines, expressed as factors of the
 * main vertical span. This is what your grid inputs are currently editing.
 *
 * Example (values in [0, 1], relative to baseline):
 *   xHeight   = 0.35
 *   ascender  = 0.65
 *   capHeight = 0.85
 *   descender = 0.20   (below baseline)
 */
export type FontLineFactors = {
  xHeight: number;
  ascender: number;
  capHeight: number;
  descender: number;
};

/**
 * Default grid proportions, equivalent to your previous constants.
 */
export const DEFAULT_FONT_LINE_FACTORS: FontLineFactors = {
  xHeight: 0.35,
  ascender: 0.65,
  capHeight: 0.85,
  descender: 0.20,
};

/**
 * Optional: absolute Y positions of the font lines in canvas space.
 * You can compute this once from the canvas size + FontLineFactors and
 * pass it around instead of recomputing in each component.
 */
export type FontVerticalMetrics = {
  capHeight: number;
  ascender: number;
  xHeight: number;
  baseline: number;
  descender: number;
};

// ---------------------------------------------------------------------------
// Skeleton model (anchor-based, relative inside the glyph box)
// ---------------------------------------------------------------------------

/**
 * Anchors for skeleton points, mapped to the global font lines.
 */
export type GlyphSkeletonAnchor =
  | 'capHeight'
  | 'ascender'
  | 'xHeight'
  | 'baseline'
  | 'descender';

/**
 * Logical point for a skeleton stroke, relative to the glyph box.
 *
 * x in [0, 1] is measured inside the "ink box" (between left/right bearings).
 * y is attached to one of the typographic anchor lines.
 */
export type GlyphSkeletonPoint = {
  x: number;
  y: GlyphSkeletonAnchor;
};

/**
 * One logical skeleton segment between two anchor-based points.
 */
export type GlyphSkeletonStrokeDef = {
  from: GlyphSkeletonPoint;
  to: GlyphSkeletonPoint;
};

/**
 * Skeleton definition for a single letter.
 * The editor converts this into concrete strokes in canvas space.
 */
export type GlyphSkeletonDef = {
  letter: string;
  strokes: GlyphSkeletonStrokeDef[];
};

// ---------------------------------------------------------------------------
// Per-letter horizontal metrics (ink box placement)
// ---------------------------------------------------------------------------

/**
 * Simple width + left side bearing profile used to place a glyph's ink box
 * within the em/canvas width.
 *
 * advanceWidthFactor:
 *   how much of the em width the glyph occupies (e.g. 0.5 = narrow, 0.9 = wide)
 *
 * leftSideBearingFactor:
 *   how much empty space from origin to start of the ink box, as a fraction of em.
 */
export type GlyphMetricProfile = {
  letter: string;
  advanceWidthFactor: number;
  leftSideBearingFactor: number;
};

/**
 * Fallback metric for letters not explicitly present in GLYPH_METRICS.
 */
export const DEFAULT_GLYPH_METRIC: GlyphMetricProfile = {
  letter: '?',
  advanceWidthFactor: 0.7,
  leftSideBearingFactor: 0.15,
};

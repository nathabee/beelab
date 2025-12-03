// src/utils/svgLines.ts

/**
 * Keys for the editable handwriting lines in the editor.
 *
 * These are *not* the same as GlyphSkeletonAnchor (which uses "xheight"),
 * here we keep the capital H for readability in code.
 */
export type LineFactorKey = 'majuscule' | 'ascender' | 'xHeight' | 'descender';

export type LineFactors = Record<LineFactorKey, number>;

/**
 * Default proportions for the five-line handwriting system, relative to
 * the main vertical band between top margin and baseline.
 *
 * These match your previous hard-coded numbers:
 * - baseline → x-height ≈ 0.35
 * - baseline → ascender ≈ 0.65
 * - baseline → majuscule ≈ 0.85
 * - descender band ≈ 0.20 below baseline
 */
export const DEFAULT_LINE_FACTORS: LineFactors = {
  xHeight: 0.35,
  ascender: 0.65,
  majuscule: 0.85,
  descender: 0.20,
};

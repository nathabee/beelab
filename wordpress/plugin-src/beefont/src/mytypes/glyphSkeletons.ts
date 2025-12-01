// src/mytypes/glyphSkeletons.ts

import {
  GlyphSkeletonDef,
  GlyphMetricProfile,
} from './glyphEditor';

/**
 * Default skeleton definitions for upper- and lowercase letters.
 * All uppercase use the "majuscule" anchor for their top.
 *
 * These are only used by the SvgGlyphEditor when the user
 * selects the "Letter skeleton" tool to insert a constructed base letter.
 */
export const GLYPH_SKELETONS: Record<string, GlyphSkeletonDef> = {
  // ---------- Uppercase A–L, T, X ----------

  A: {
    letter: 'A',
    strokes: [
      // left diagonal
      { from: { x: 0.10, y: 'baseline' }, to: { x: 0.50, y: 'majuscule' } },
      // right diagonal
      { from: { x: 0.90, y: 'baseline' }, to: { x: 0.50, y: 'majuscule' } },
      // crossbar
      { from: { x: 0.25, y: 'xheight' }, to: { x: 0.75, y: 'xheight' } },
    ],
  },


  B: {
    letter: 'B',
    strokes: [
      // main stem: full height
      { from: { x: 0.18, y: 'majuscule' }, to: { x: 0.18, y: 'baseline' } },

      // upper bowl (3 segments around the curve)
      // top horizontal
      { from: { x: 0.18, y: 'majuscule' }, to: { x: 0.68, y: 'majuscule' } },
      // outer down towards x-height
      { from: { x: 0.68, y: 'majuscule' }, to: { x: 0.78, y: 'xheight' } },
      // back in to stem at x-height
      { from: { x: 0.78, y: 'xheight' },   to: { x: 0.18, y: 'xheight' } },

      // lower bowl (again 3 segments)
      // small step out from stem at x-height (connection)
      { from: { x: 0.18, y: 'xheight' },   to: { x: 0.68, y: 'xheight' } },
      // outer down towards baseline
      { from: { x: 0.68, y: 'xheight' },   to: { x: 0.78, y: 'baseline' } },
      // back in to stem at baseline
      { from: { x: 0.78, y: 'baseline' },  to: { x: 0.18, y: 'baseline' } },
    ],
  },

  C: {
    letter: 'C',
    strokes: [
      // top
      { from: { x: 0.80, y: 'majuscule' }, to: { x: 0.20, y: 'majuscule' } },
      // left vertical
      { from: { x: 0.20, y: 'majuscule' }, to: { x: 0.20, y: 'baseline' } },
      // bottom
      { from: { x: 0.20, y: 'baseline' }, to: { x: 0.80, y: 'baseline' } },
    ],
  },

  D: {
    letter: 'D',
    strokes: [
      // left vertical
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.15, y: 'baseline' } },
      // top
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.80, y: 'majuscule' } },
      // bottom
      { from: { x: 0.15, y: 'baseline' }, to: { x: 0.80, y: 'baseline' } },
      // right vertical
      { from: { x: 0.80, y: 'majuscule' }, to: { x: 0.80, y: 'baseline' } },
    ],
  },

  E: {
    letter: 'E',
    strokes: [
      // main vertical
      { from: { x: 0.10, y: 'majuscule' }, to: { x: 0.10, y: 'baseline' } },
      // top bar
      { from: { x: 0.10, y: 'majuscule' }, to: { x: 0.90, y: 'majuscule' } },
      // middle bar
      { from: { x: 0.10, y: 'xheight' }, to: { x: 0.70, y: 'xheight' } },
      // bottom bar
      { from: { x: 0.10, y: 'baseline' }, to: { x: 0.90, y: 'baseline' } },
    ],
  },

  F: {
    letter: 'F',
    strokes: [
      // main vertical
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.15, y: 'baseline' } },
      // top bar
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.85, y: 'majuscule' } },
      // middle bar
      { from: { x: 0.15, y: 'xheight' }, to: { x: 0.65, y: 'xheight' } },
    ],
  },

  G: {
    letter: 'G',
    strokes: [
      // C-shape
      { from: { x: 0.80, y: 'majuscule' }, to: { x: 0.20, y: 'majuscule' } },
      { from: { x: 0.20, y: 'majuscule' }, to: { x: 0.20, y: 'baseline' } },
      { from: { x: 0.20, y: 'baseline' }, to: { x: 0.80, y: 'baseline' } },
      // inner horizontal “G-bar”
      { from: { x: 0.50, y: 'xheight' }, to: { x: 0.80, y: 'xheight' } },
    ],
  },

  H: {
    letter: 'H',
    strokes: [
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.15, y: 'baseline' } },
      { from: { x: 0.85, y: 'majuscule' }, to: { x: 0.85, y: 'baseline' } },
      { from: { x: 0.15, y: 'xheight' }, to: { x: 0.85, y: 'xheight' } },
    ],
  },

  I: {
    letter: 'I',
    strokes: [
      // top bar (narrower than full width)
      { from: { x: 0.30, y: 'majuscule' }, to: { x: 0.70, y: 'majuscule' } },
      // vertical stem
      { from: { x: 0.50, y: 'majuscule' }, to: { x: 0.50, y: 'baseline' } },
      // bottom bar
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  J: {
    letter: 'J',
    strokes: [
      // top horizontal bar
      { from: { x: 0.20, y: 'majuscule' }, to: { x: 0.80, y: 'majuscule' } },
      // right vertical stem
      { from: { x: 0.80, y: 'majuscule' }, to: { x: 0.80, y: 'baseline' } },
      // bottom hook
      { from: { x: 0.80, y: 'baseline' }, to: { x: 0.40, y: 'baseline' } },
      { from: { x: 0.40, y: 'baseline' }, to: { x: 0.40, y: 'xheight' } },
    ],
  },

  K: {
    letter: 'K',
    strokes: [
      // main vertical
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.15, y: 'baseline' } },
      // upper diagonal
      { from: { x: 0.15, y: 'xheight' }, to: { x: 0.85, y: 'majuscule' } },
      // lower diagonal
      { from: { x: 0.15, y: 'xheight' }, to: { x: 0.85, y: 'baseline' } },
    ],
  },

  L: {
    letter: 'L',
    strokes: [
      { from: { x: 0.15, y: 'majuscule' }, to: { x: 0.15, y: 'baseline' } },
      { from: { x: 0.15, y: 'baseline' }, to: { x: 0.90, y: 'baseline' } },
    ],
  },

  T: {
    letter: 'T',
    strokes: [
      { from: { x: 0.10, y: 'majuscule' }, to: { x: 0.90, y: 'majuscule' } },
      { from: { x: 0.50, y: 'majuscule' }, to: { x: 0.50, y: 'baseline' } },
    ],
  },

  X: {
    letter: 'X',
    strokes: [
      { from: { x: 0.10, y: 'majuscule' }, to: { x: 0.90, y: 'baseline' } },
      { from: { x: 0.90, y: 'majuscule' }, to: { x: 0.10, y: 'baseline' } },
    ],
  },

  // ---------- Lowercase a–l ----------

  a: {
    letter: 'a',
    strokes: [
      // simple “box” a (no ascender)
      { from: { x: 0.25, y: 'xheight' }, to: { x: 0.25, y: 'baseline' } },
      { from: { x: 0.25, y: 'xheight' }, to: { x: 0.75, y: 'xheight' } },
      { from: { x: 0.75, y: 'xheight' }, to: { x: 0.75, y: 'baseline' } },
      { from: { x: 0.25, y: 'baseline' }, to: { x: 0.75, y: 'baseline' } },
    ],
  },

  b: {
    letter: 'b',
    strokes: [
      // main stem
      { from: { x: 0.30, y: 'ascender' }, to: { x: 0.30, y: 'baseline' } },
      // bowl
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.70, y: 'xheight' } },
      { from: { x: 0.70, y: 'xheight' }, to: { x: 0.70, y: 'baseline' } },
      { from: { x: 0.70, y: 'baseline' }, to: { x: 0.30, y: 'baseline' } },
    ],
  },

  c: {
    letter: 'c',
    strokes: [
      { from: { x: 0.70, y: 'xheight' }, to: { x: 0.30, y: 'xheight' } },
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.30, y: 'baseline' } },
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  d: {
    letter: 'd',
    strokes: [
      // main stem (on the right)
      { from: { x: 0.70, y: 'ascender' }, to: { x: 0.70, y: 'baseline' } },
      // bowl to the left
      { from: { x: 0.70, y: 'xheight' }, to: { x: 0.30, y: 'xheight' } },
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.30, y: 'baseline' } },
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  e: {
    letter: 'e',
    strokes: [
      // top bar
      { from: { x: 0.70, y: 'xheight' }, to: { x: 0.30, y: 'xheight' } },
      // left vertical
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.30, y: 'baseline' } },
      // bottom bar
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  f: {
    letter: 'f',
    strokes: [
      // tall vertical with slight descender
      { from: { x: 0.40, y: 'majuscule' }, to: { x: 0.40, y: 'descender' } },
      // crossbar near x-height
      { from: { x: 0.20, y: 'xheight' }, to: { x: 0.70, y: 'xheight' } },
    ],
  },

  g: {
    letter: 'g',
    strokes: [
      // upper “o”-like loop
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.70, y: 'xheight' } },
      { from: { x: 0.70, y: 'xheight' }, to: { x: 0.70, y: 'baseline' } },
      { from: { x: 0.70, y: 'baseline' }, to: { x: 0.30, y: 'baseline' } },
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.30, y: 'xheight' } },
      // descender tail
      { from: { x: 0.55, y: 'baseline' }, to: { x: 0.55, y: 'descender' } },
    ],
  },

  h: {
    letter: 'h',
    strokes: [
      // main stem
      { from: { x: 0.30, y: 'ascender' }, to: { x: 0.30, y: 'baseline' } },
      // right leg / arch
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.70, y: 'xheight' } },
      { from: { x: 0.70, y: 'xheight' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  i: {
    letter: 'i',
    strokes: [
      // small stem
      { from: { x: 0.50, y: 'xheight' }, to: { x: 0.50, y: 'baseline' } },
      // “dot” as short segment
      { from: { x: 0.50, y: 'majuscule' }, to: { x: 0.50, y: 'ascender' } },
    ],
  },

  j: {
    letter: 'j',
    strokes: [
      // stem into descender
      { from: { x: 0.55, y: 'xheight' }, to: { x: 0.55, y: 'descender' } },
      // top “dot”
      { from: { x: 0.55, y: 'majuscule' }, to: { x: 0.55, y: 'ascender' } },
    ],
  },

  k: {
    letter: 'k',
    strokes: [
      // main stem
      { from: { x: 0.30, y: 'ascender' }, to: { x: 0.30, y: 'baseline' } },
      // diagonals from x-height
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.75, y: 'xheight' } },
      { from: { x: 0.30, y: 'xheight' }, to: { x: 0.75, y: 'baseline' } },
    ],
  },

  l: {
    letter: 'l',
    strokes: [
      { from: { x: 0.40, y: 'ascender' }, to: { x: 0.40, y: 'baseline' } },
    ],
  },
};

/**
 * Glyph width/left-bearing metrics for the “ink box”.
 * Used by the editor to place the reference rectangle and Arial preview.
 */
export const GLYPH_METRICS: Record<string, GlyphMetricProfile> = {
  A: { letter: 'A', widthFactor: 0.75, leftBearingFactor: 0.125 },
  B: { letter: 'B', widthFactor: 0.72, leftBearingFactor: 0.14 },
  C: { letter: 'C', widthFactor: 0.70, leftBearingFactor: 0.15 },
  D: { letter: 'D', widthFactor: 0.72, leftBearingFactor: 0.14 },
  E: { letter: 'E', widthFactor: 0.68, leftBearingFactor: 0.16 },
  F: { letter: 'F', widthFactor: 0.66, leftBearingFactor: 0.17 },
  G: { letter: 'G', widthFactor: 0.74, leftBearingFactor: 0.13 },
  H: { letter: 'H', widthFactor: 0.78, leftBearingFactor: 0.11 },
  I: { letter: 'I', widthFactor: 0.40, leftBearingFactor: 0.30 },
  J: { letter: 'J', widthFactor: 0.55, leftBearingFactor: 0.23 },
  K: { letter: 'K', widthFactor: 0.74, leftBearingFactor: 0.13 },

  a: { letter: 'a', widthFactor: 0.70, leftBearingFactor: 0.15 },
  b: { letter: 'b', widthFactor: 0.65, leftBearingFactor: 0.18 },
  c: { letter: 'c', widthFactor: 0.62, leftBearingFactor: 0.19 },
  d: { letter: 'd', widthFactor: 0.65, leftBearingFactor: 0.18 },
  e: { letter: 'e', widthFactor: 0.63, leftBearingFactor: 0.185 },
  f: { letter: 'f', widthFactor: 0.50, leftBearingFactor: 0.25 },
  g: { letter: 'g', widthFactor: 0.68, leftBearingFactor: 0.16 },
  h: { letter: 'h', widthFactor: 0.68, leftBearingFactor: 0.16 },
  i: { letter: 'i', widthFactor: 0.35, leftBearingFactor: 0.325 },
  j: { letter: 'j', widthFactor: 0.45, leftBearingFactor: 0.275 },
  k: { letter: 'k', widthFactor: 0.62, leftBearingFactor: 0.19 },
  l: { letter: 'l', widthFactor: 0.35, leftBearingFactor: 0.325 },
};

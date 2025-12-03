// src/mytypes/glyphSkeletons.ts

import {
  GlyphSkeletonDef,
  GlyphMetricProfile,
} from './glyphEditor';


/**
 * Raw SVG snippets for default letter shapes.
 * These should be in the same coordinate system as your editor canvas
 * (e.g. 600x600).
 */
export const GLYPH_SKELETON_SVGS: Record<string, string> = {
  A: `
    <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="171.89" y1="534.83" x2="294.89" y2="228.83" stroke-width="16" />
    <line x1="299.89" y1="226.83" x2="430.89" y2="542.83" stroke-width="16" />
    <line x1="219.89" y1="430.83" x2="379.89" y2="430.83" stroke-width="16" />
  </g>
  `, 
  B: `
<g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="200.89" y1="539.83" x2="201.89" y2="229.83" stroke-width="16" />
    <line x1="205.89" y1="232.83" x2="338.89" y2="231.83" stroke-width="16" />
    <line x1="205.89" y1="378.83" x2="343.89" y2="380.83" stroke-width="16" />
    <line x1="207.89" y1="538.83" x2="338.89" y2="539.83" stroke-width="16" />
    <path d="M 342.89 538.83 Q 426.39 515.83 422.89 451.83" stroke-width="16" />
    <path d="M 423.89 445.83 Q 408.39 379.83 344.89 380.83" stroke-width="16" />
    <path d="M 342.89 374.83 Q 411.39 362.83 407.89 302.83" stroke-width="16" />
    <path d="M 407.39 298.83 Q 390.39 242.83 342.39 232.83" stroke-width="16" />
  </g>
  `, 
  C: `
    <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M 419.89 298.83 Q 298.89 183.83 198.89 296.83" stroke-width="16" />
      <path d="M 196.89 299.83 Q 142.89 393.83 203.89 496.83" stroke-width="16" />
      <path d="M 204.89 498.83 Q 329.89 585.83 423.89 467.83" stroke-width="16" />
    </g>
  `, 
  D: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="187.89" y1="236.83" x2="189.89" y2="538.83" stroke-width="16" />
    <path d="M 194.89 538.83 Q 433.89 568.83 441.89 371.83" stroke-width="16" />
    <path d="M 193.89 236.83 Q 430.89 204.83 446.89 369.83" stroke-width="16" />
  </g>
  `, 
  E: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="414.89" y1="249.83" x2="203.89" y2="249.83" stroke-width="16" />
    <line x1="197.89" y1="249.83" x2="200.89" y2="532.83" stroke-width="16" />
    <line x1="199.89" y1="538.83" x2="428.89" y2="540.83" stroke-width="16" />
    <line x1="206.89" y1="379.83" x2="404.89" y2="383.83" stroke-width="16" />
  </g>
  `, 
  F: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="414.89" y1="248.83" x2="215.89" y2="250.83" stroke-width="16" />
    <line x1="206.89" y1="248.83" x2="210.89" y2="543.83" stroke-width="16" />
    <line x1="214.89" y1="399.83" x2="414.89" y2="399.83" stroke-width="16" />
  </g>
  `, 
  G: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 417.89 300.83 Q 185.89 144.83 160.89 373.83" stroke-width="16" />
    <path d="M 155.89 374.83 Q 143.89 520.83 307.89 547.83" stroke-width="16" />
    <path d="M 308.89 541.83 Q 392.89 538.83 437.89 487.83" stroke-width="16" />
    <line x1="437.89" y1="384.83" x2="440.89" y2="483.83" stroke-width="16" />
    <line x1="312.89" y1="384.83" x2="434.89" y2="385.83" stroke-width="16" />
  </g>
  `,   
  a: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="373.89" y1="534.83" x2="360.89" y2="311.83" stroke-width="16" />
    <path d="M 362.89 508.83 Q 223.89 577.83 195.89 505.83" stroke-width="16" />
    <path d="M 354.89 331.83 Q 300.89 298.83 249.89 335.83" stroke-width="16" />
    <path d="M 194.89 497.83 Q 178.89 405.83 246.89 337.83" stroke-width="16" />
  </g>
  `, 
  b: `  
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="224.89" y1="212.83" x2="222.89" y2="536.83" stroke-width="16" />
    <path d="M 228.89 462.83 Q 400.89 599.83 408.89 417.83" stroke-width="16" />
    <path d="M 228.89 354.83 Q 398.89 249.83 407.89 412.83" stroke-width="16" />
  </g>
  `, 
  c: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 387.89 369.83 Q 262.89 228.83 218.89 372.83" stroke-width="16" />
    <path d="M 217.89 377.83 Q 203.89 520.83 278.89 540.83" stroke-width="16" />
    <path d="M 284.89 537.83 Q 369.89 553.83 397.89 472.83" stroke-width="16" />
  </g>
  `, 
  d: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="375.89" y1="221.83" x2="381.89" y2="544.83" stroke-width="16" />
    <path d="M 375.89 462.83 Q 290.89 598.83 213.89 466.83" stroke-width="16" />
    <path d="M 209.89 463.83 Q 192.89 399.83 216.89 338.83" stroke-width="16" />
    <path d="M 217.89 332.83 Q 299.89 245.83 373.89 360.83" stroke-width="16" />
  </g>
  `, 
  e: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="395.89" y1="422.83" x2="197.89" y2="423.83" stroke-width="16" />
    <path d="M 199.89 411.83 Q 228.89 182.83 399.89 413.83" stroke-width="16" />
    <path d="M 197.89 428.83 Q 221.89 596.83 393.89 492.83" stroke-width="16" />
  </g>
  `, 
  f: `
   <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 296.89 535.83 Q 249.89 163.83 354.89 220.83" stroke-width="16" />
    <line x1="245.89" y1="317.83" x2="337.89" y2="316.83" stroke-width="16" />
  </g>
  `, 
  g: `
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M 197.89 561.83 Q 298.89 724.83 390.89 563.83" stroke-width="16" />
    <line x1="384.89" y1="311.83" x2="392.89" y2="560.83" stroke-width="16" />
    <path d="M 380.89 368.83 Q 206.89 226.83 202.89 433.83" stroke-width="16" />
    <path d="M 202.89 438.83 Q 244.89 597.83 387.89 456.83" stroke-width="16" />
  </g>
  `, 
};

/**
 * Default skeleton definitions for upper- and lowercase letters.
 *
 * All uppercase use the "capHeight" anchor for their top.
 * All skeleton points are relative inside the per-letter ink box
 * (0..1 horizontally, anchored to capHeight/xHeight/baseline/… vertically).
 */
export const GLYPH_SKELETONS: Record<string, GlyphSkeletonDef> = {
  // ---------- Uppercase A–L, T, X ----------

  A: {
    letter: 'A',
    strokes: [
      // left diagonal
      { from: { x: 0.10, y: 'baseline' },  to: { x: 0.50, y: 'capHeight' } },
      // right diagonal
      { from: { x: 0.90, y: 'baseline' },  to: { x: 0.50, y: 'capHeight' } },
      // crossbar
      { from: { x: 0.25, y: 'xHeight'  },  to: { x: 0.75, y: 'xHeight'  } },
    ],
  },

  B: {
    letter: 'B',
    strokes: [
      // main stem: full height
      { from: { x: 0.18, y: 'capHeight' }, to: { x: 0.18, y: 'baseline' } },

      // upper bowl
      { from: { x: 0.18, y: 'capHeight' }, to: { x: 0.68, y: 'capHeight' } },
      { from: { x: 0.68, y: 'capHeight' }, to: { x: 0.78, y: 'xHeight'   } },
      { from: { x: 0.78, y: 'xHeight'   }, to: { x: 0.18, y: 'xHeight'   } },

      // lower bowl
      { from: { x: 0.18, y: 'xHeight'   }, to: { x: 0.68, y: 'xHeight'   } },
      { from: { x: 0.68, y: 'xHeight'   }, to: { x: 0.78, y: 'baseline'  } },
      { from: { x: 0.78, y: 'baseline'  }, to: { x: 0.18, y: 'baseline'  } },
    ],
  },

  C: {
    letter: 'C',
    strokes: [
      // top
      { from: { x: 0.80, y: 'capHeight' }, to: { x: 0.20, y: 'capHeight' } },
      // left vertical
      { from: { x: 0.20, y: 'capHeight' }, to: { x: 0.20, y: 'baseline' } },
      // bottom
      { from: { x: 0.20, y: 'baseline'  }, to: { x: 0.80, y: 'baseline'  } },
    ],
  },

  D: {
    letter: 'D',
    strokes: [
      // left vertical
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.15, y: 'baseline' } },
      // top
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.80, y: 'capHeight' } },
      // bottom
      { from: { x: 0.15, y: 'baseline'  }, to: { x: 0.80, y: 'baseline'  } },
      // right vertical
      { from: { x: 0.80, y: 'capHeight' }, to: { x: 0.80, y: 'baseline' } },
    ],
  },

  E: {
    letter: 'E',
    strokes: [
      // main vertical
      { from: { x: 0.10, y: 'capHeight' }, to: { x: 0.10, y: 'baseline' } },
      // top bar
      { from: { x: 0.10, y: 'capHeight' }, to: { x: 0.90, y: 'capHeight' } },
      // middle bar
      { from: { x: 0.10, y: 'xHeight'   }, to: { x: 0.70, y: 'xHeight'   } },
      // bottom bar
      { from: { x: 0.10, y: 'baseline'  }, to: { x: 0.90, y: 'baseline'  } },
    ],
  },

  F: {
    letter: 'F',
    strokes: [
      // main vertical
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.15, y: 'baseline' } },
      // top bar
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.85, y: 'capHeight' } },
      // middle bar
      { from: { x: 0.15, y: 'xHeight'   }, to: { x: 0.65, y: 'xHeight'   } },
    ],
  },

  G: {
    letter: 'G',
    strokes: [
      // C-shape
      { from: { x: 0.80, y: 'capHeight' }, to: { x: 0.20, y: 'capHeight' } },
      { from: { x: 0.20, y: 'capHeight' }, to: { x: 0.20, y: 'baseline' } },
      { from: { x: 0.20, y: 'baseline'  }, to: { x: 0.80, y: 'baseline'  } },
      // inner horizontal “G-bar”
      { from: { x: 0.50, y: 'xHeight'   }, to: { x: 0.80, y: 'xHeight'   } },
    ],
  },

  H: {
    letter: 'H',
    strokes: [
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.15, y: 'baseline' } },
      { from: { x: 0.85, y: 'capHeight' }, to: { x: 0.85, y: 'baseline' } },
      { from: { x: 0.15, y: 'xHeight'   }, to: { x: 0.85, y: 'xHeight'   } },
    ],
  },

  I: {
    letter: 'I',
    strokes: [
      // top bar (narrower)
      { from: { x: 0.30, y: 'capHeight' }, to: { x: 0.70, y: 'capHeight' } },
      // vertical stem
      { from: { x: 0.50, y: 'capHeight' }, to: { x: 0.50, y: 'baseline' } },
      // bottom bar
      { from: { x: 0.30, y: 'baseline'  }, to: { x: 0.70, y: 'baseline'  } },
    ],
  },

  J: {
    letter: 'J',
    strokes: [
      // top horizontal bar
      { from: { x: 0.20, y: 'capHeight' }, to: { x: 0.80, y: 'capHeight' } },
      // right vertical stem
      { from: { x: 0.80, y: 'capHeight' }, to: { x: 0.80, y: 'baseline' } },
      // bottom hook
      { from: { x: 0.80, y: 'baseline'  }, to: { x: 0.40, y: 'baseline'  } },
      { from: { x: 0.40, y: 'baseline'  }, to: { x: 0.40, y: 'xHeight'   } },
    ],
  },

  K: {
    letter: 'K',
    strokes: [
      // main vertical
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.15, y: 'baseline' } },
      // upper diagonal
      { from: { x: 0.15, y: 'xHeight'   }, to: { x: 0.85, y: 'capHeight' } },
      // lower diagonal
      { from: { x: 0.15, y: 'xHeight'   }, to: { x: 0.85, y: 'baseline' } },
    ],
  },

  L: {
    letter: 'L',
    strokes: [
      { from: { x: 0.15, y: 'capHeight' }, to: { x: 0.15, y: 'baseline' } },
      { from: { x: 0.15, y: 'baseline'  }, to: { x: 0.90, y: 'baseline'  } },
    ],
  },

  T: {
    letter: 'T',
    strokes: [
      { from: { x: 0.10, y: 'capHeight' }, to: { x: 0.90, y: 'capHeight' } },
      { from: { x: 0.50, y: 'capHeight' }, to: { x: 0.50, y: 'baseline' } },
    ],
  },

  X: {
    letter: 'X',
    strokes: [
      { from: { x: 0.10, y: 'capHeight' }, to: { x: 0.90, y: 'baseline' } },
      { from: { x: 0.90, y: 'capHeight' }, to: { x: 0.10, y: 'baseline' } },
    ],
  },

  // ---------- Lowercase a–l ----------

  a: {
    letter: 'a',
    strokes: [
      // simple “box” a (no ascender)
      { from: { x: 0.25, y: 'xHeight' }, to: { x: 0.25, y: 'baseline' } },
      { from: { x: 0.25, y: 'xHeight' }, to: { x: 0.75, y: 'xHeight' } },
      { from: { x: 0.75, y: 'xHeight' }, to: { x: 0.75, y: 'baseline' } },
      { from: { x: 0.25, y: 'baseline' }, to: { x: 0.75, y: 'baseline' } },
    ],
  },

  b: {
    letter: 'b',
    strokes: [
      // main stem
      { from: { x: 0.30, y: 'ascender' }, to: { x: 0.30, y: 'baseline' } },
      // bowl
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.70, y: 'xHeight'  } },
      { from: { x: 0.70, y: 'xHeight'  }, to: { x: 0.70, y: 'baseline' } },
      { from: { x: 0.70, y: 'baseline' }, to: { x: 0.30, y: 'baseline' } },
    ],
  },

  c: {
    letter: 'c',
    strokes: [
      { from: { x: 0.70, y: 'xHeight'  }, to: { x: 0.30, y: 'xHeight'  } },
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.30, y: 'baseline' } },
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  d: {
    letter: 'd',
    strokes: [
      // main stem (on the right)
      { from: { x: 0.70, y: 'ascender' }, to: { x: 0.70, y: 'baseline' } },
      // bowl to the left
      { from: { x: 0.70, y: 'xHeight'  }, to: { x: 0.30, y: 'xHeight'  } },
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.30, y: 'baseline' } },
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  e: {
    letter: 'e',
    strokes: [
      // top bar
      { from: { x: 0.70, y: 'xHeight'  }, to: { x: 0.30, y: 'xHeight'  } },
      // left vertical
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.30, y: 'baseline' } },
      // bottom bar
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  f: {
    letter: 'f',
    strokes: [
      // tall vertical with slight descender
      { from: { x: 0.40, y: 'capHeight' }, to: { x: 0.40, y: 'descender' } },
      // crossbar near x-height
      { from: { x: 0.20, y: 'xHeight'  }, to: { x: 0.70, y: 'xHeight'  } },
    ],
  },

  g: {
    letter: 'g',
    strokes: [
      // upper “o”-like loop
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.70, y: 'xHeight'  } },
      { from: { x: 0.70, y: 'xHeight'  }, to: { x: 0.70, y: 'baseline' } },
      { from: { x: 0.70, y: 'baseline' }, to: { x: 0.30, y: 'baseline' } },
      { from: { x: 0.30, y: 'baseline' }, to: { x: 0.30, y: 'xHeight'  } },
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
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.70, y: 'xHeight'  } },
      { from: { x: 0.70, y: 'xHeight'  }, to: { x: 0.70, y: 'baseline' } },
    ],
  },

  i: {
    letter: 'i',
    strokes: [
      // small stem
      { from: { x: 0.50, y: 'xHeight'  }, to: { x: 0.50, y: 'baseline' } },
      // “dot” as short segment
      { from: { x: 0.50, y: 'capHeight' }, to: { x: 0.50, y: 'ascender' } },
    ],
  },

  j: {
    letter: 'j',
    strokes: [
      // stem into descender
      { from: { x: 0.55, y: 'xHeight'  }, to: { x: 0.55, y: 'descender' } },
      // top “dot”
      { from: { x: 0.55, y: 'capHeight' }, to: { x: 0.55, y: 'ascender' } },
    ],
  },

  k: {
    letter: 'k',
    strokes: [
      // main stem
      { from: { x: 0.30, y: 'ascender' }, to: { x: 0.30, y: 'baseline' } },
      // diagonals from x-height
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.75, y: 'xHeight'  } },
      { from: { x: 0.30, y: 'xHeight'  }, to: { x: 0.75, y: 'baseline' } },
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
  A: { letter: 'A', advanceWidthFactor: 0.75, leftSideBearingFactor: 0.125 },
  B: { letter: 'B', advanceWidthFactor: 0.72, leftSideBearingFactor: 0.14 },
  C: { letter: 'C', advanceWidthFactor: 0.70, leftSideBearingFactor: 0.15 },
  D: { letter: 'D', advanceWidthFactor: 0.72, leftSideBearingFactor: 0.14 },
  E: { letter: 'E', advanceWidthFactor: 0.68, leftSideBearingFactor: 0.16 },
  F: { letter: 'F', advanceWidthFactor: 0.66, leftSideBearingFactor: 0.17 },
  G: { letter: 'G', advanceWidthFactor: 0.74, leftSideBearingFactor: 0.13 },
  H: { letter: 'H', advanceWidthFactor: 0.78, leftSideBearingFactor: 0.11 },
  I: { letter: 'I', advanceWidthFactor: 0.40, leftSideBearingFactor: 0.30 },
  J: { letter: 'J', advanceWidthFactor: 0.55, leftSideBearingFactor: 0.23 },
  K: { letter: 'K', advanceWidthFactor: 0.74, leftSideBearingFactor: 0.13 },

  a: { letter: 'a', advanceWidthFactor: 0.70, leftSideBearingFactor: 0.15 },
  b: { letter: 'b', advanceWidthFactor: 0.65, leftSideBearingFactor: 0.18 },
  c: { letter: 'c', advanceWidthFactor: 0.62, leftSideBearingFactor: 0.19 },
  d: { letter: 'd', advanceWidthFactor: 0.65, leftSideBearingFactor: 0.18 },
  e: { letter: 'e', advanceWidthFactor: 0.63, leftSideBearingFactor: 0.185 },
  f: { letter: 'f', advanceWidthFactor: 0.50, leftSideBearingFactor: 0.25 },
  g: { letter: 'g', advanceWidthFactor: 0.68, leftSideBearingFactor: 0.16 },
  h: { letter: 'h', advanceWidthFactor: 0.68, leftSideBearingFactor: 0.16 },
  i: { letter: 'i', advanceWidthFactor: 0.35, leftSideBearingFactor: 0.325 },
  j: { letter: 'j', advanceWidthFactor: 0.45, leftSideBearingFactor: 0.275 },
  k: { letter: 'k', advanceWidthFactor: 0.62, leftSideBearingFactor: 0.19 },
  l: { letter: 'l', advanceWidthFactor: 0.35, leftSideBearingFactor: 0.325 },
};

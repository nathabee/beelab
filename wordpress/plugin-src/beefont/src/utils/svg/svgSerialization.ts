// src/utils/svg/svgSerialization.ts

import type { Stroke } from '@mytypes/glyphEditor';
import {
  DEFAULT_SVG_CANVAS_WIDTH,
  DEFAULT_SVG_CANVAS_HEIGHT,
} from '@mytypes/glyphEditor';

/**
 * Optional horizontal viewBox override.
 * left/right are absolute canvas coordinates (0..600).
 */
export type SvgViewBoxOverride = {
  left: number;
  right: number;
};

/**
 * Exported SVG: only the real strokes (lines or curves),
 * no guides/preview/letters.
 *
 * `viewBoxOverride` lets the caller "crop" horizontally via viewBox.
 */
export function serializeGlyphToSvg(
  strokes: Stroke[],
  letter: string,
  viewBoxOverride?: SvgViewBoxOverride,
): string {
  void letter; // still unused: geometry only

  const canvasWidth = DEFAULT_SVG_CANVAS_WIDTH;
  const canvasHeight = DEFAULT_SVG_CANVAS_HEIGHT;

  // Default: full canvas
  let minX = 0;
  let width = canvasWidth;

  if (viewBoxOverride) {
    const rawLeft = viewBoxOverride.left;
    const rawRight = viewBoxOverride.right;
    const clampedLeft = Math.max(0, Math.min(canvasWidth, rawLeft));
    const clampedRight = Math.max(
      clampedLeft + 1,
      Math.min(canvasWidth, rawRight),
    ); // ensure at least 1px width

    minX = clampedLeft;
    width = clampedRight - clampedLeft;
  }

  const viewBoxAttr = `${minX.toFixed(2)} 0 ${width.toFixed(
    2,
  )} ${canvasHeight.toFixed(2)}`;

  const elements = strokes
    .map(s => {
      const { p0, p1, ctrl, width: sw } = s;

      if (ctrl) {
        // Quadratic Bézier: M p0 Q ctrl p1
        return `<path d="M ${p0.x.toFixed(2)} ${p0.y.toFixed(
          2,
        )} Q ${ctrl.x.toFixed(2)} ${ctrl.y.toFixed(
          2,
        )} ${p1.x.toFixed(2)} ${p1.y.toFixed(
          2,
        )}" stroke-width="${sw}" />`;
      }

      // Straight line
      return `<line x1="${p0.x.toFixed(2)}" y1="${p0.y.toFixed(
        2,
      )}" x2="${p1.x.toFixed(2)}" y2="${p1.y.toFixed(
        2,
      )}" stroke-width="${sw}" />`;
    })
    .join('\n    ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="${viewBoxAttr}"
>
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${elements}
  </g>
</svg>`;

  return svg;
}

/**
 * Parse our own serialized SVG back into strokes.
 *
 * Assumes the same simple formats as serializeGlyphToSvg():
 *   - <line ... x1="" y1="" x2="" y2="" stroke-width="" />
 *   - <path ... d="M x0 y0 Q cx cy x1 y1" stroke-width="" />
 */
export function parseSvgToStrokes(svgContent: string): Stroke[] {
  const strokes: Stroke[] = [];
  if (!svgContent) return strokes;

  const lineRegex =
    /<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"[^>]*stroke-width="([^"]+)"[^>]*\/?>/g;

  const pathRegex =
    /<path[^>]*d="M\s*([-0-9.]+)\s+([-0-9.]+)\s+Q\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)"[^>]*stroke-width="([^"]+)"[^>]*\/?>/g;

  let match: RegExpExecArray | null;
  let index = 0;
  const now = Date.now();

  while ((match = lineRegex.exec(svgContent)) !== null) {
    const [, x1, y1, x2, y2, width] = match;
    const sw = parseFloat(width);

    strokes.push({
      id: `stroke-line-${now}-${index++}`,
      p0: { x: parseFloat(x1), y: parseFloat(y1) },
      p1: { x: parseFloat(x2), y: parseFloat(y2) },
      width: Number.isFinite(sw) ? sw : 8,
    });
  }

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const [, x0, y0, cx, cy, x1, y1, width] = match;
    const sw = parseFloat(width);

    strokes.push({
      id: `stroke-path-${now}-${index++}`,
      p0: { x: parseFloat(x0), y: parseFloat(y0) },
      p1: { x: parseFloat(x1), y: parseFloat(y1) },
      ctrl: { x: parseFloat(cx), y: parseFloat(cy) },
      width: Number.isFinite(sw) ? sw : 8,
    });
  }

  return strokes;
}

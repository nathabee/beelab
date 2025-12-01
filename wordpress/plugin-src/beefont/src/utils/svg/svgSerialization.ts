// src/utils/svgSerialization.ts

 import type { Stroke, Point } from '@mytypes/glyphEditor';


/**
 * Convert our strokes into an SVG string.
 * Only the real strokes are included — no guidelines, preview text or editor extras.
 */
export function serializeGlyphToSvg(strokes: Stroke[], letter: string): string {
  void letter; // intentionally unused

  const width = 600;
  const height = 600;

  const elements = strokes
    .map(s => {
      const { p0, p1, ctrl, width: w } = s;

      if (ctrl) {
        return `<path d="M ${p0.x.toFixed(2)} ${p0.y.toFixed(
          2,
        )} Q ${ctrl.x.toFixed(2)} ${ctrl.y.toFixed(
          2,
        )} ${p1.x.toFixed(2)} ${p1.y.toFixed(
          2,
        )}" stroke-width="${w}" />`;
      }

      return `<line x1="${p0.x.toFixed(2)}" y1="${p0.y.toFixed(
        2,
      )}" x2="${p1.x.toFixed(2)}" y2="${p1.y.toFixed(
        2,
      )}" stroke-width="${w}" />`;
    })
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
>
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${elements}
  </g>
</svg>`;
}

/**
 * Parse our own serialized SVG format back into strokes.
 * Handles:
 *   - <line ... stroke-width="n" />
 *   - <path d="M ... Q ... ..." stroke-width="n" />
 */
export function parseSvgToStrokes(svgContent: string): Stroke[] {
  const strokes: Stroke[] = [];
  if (!svgContent) return strokes;

  const lineRegex =
    /<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"[^>]*stroke-width="([^"]+)"[^>]*\/?>/g;

  const pathRegex =
    /<path[^>]*d="M\s*([-0-9.]+)\s+([-0-9.]+)\s+Q\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)"[^>]*stroke-width="([^"]+)"[^>]*\/?>/g;

  let match: RegExpExecArray | null;

  while ((match = lineRegex.exec(svgContent)) !== null) {
    const [, x1, y1, x2, y2, width] = match;

    strokes.push({
      id: `stroke-line-${strokes.length}-${Date.now()}`,
      p0: { x: parseFloat(x1), y: parseFloat(y1) },
      p1: { x: parseFloat(x2), y: parseFloat(y2) },
      width: Number.isFinite(parseFloat(width)) ? parseFloat(width) : 8,
    });
  }

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const [, x0, y0, cx, cy, x1, y1, width] = match;

    strokes.push({
      id: `stroke-path-${strokes.length}-${Date.now()}`,
      p0: { x: parseFloat(x0), y: parseFloat(y0) },
      p1: { x: parseFloat(x1), y: parseFloat(y1) },
      ctrl: { x: parseFloat(cx), y: parseFloat(cy) },
      width: Number.isFinite(parseFloat(width)) ? parseFloat(width) : 8,
    });
  }

  return strokes;
}

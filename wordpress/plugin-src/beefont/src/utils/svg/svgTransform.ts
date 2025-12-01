// utils/svg/svgTransform.ts
import type { Stroke, Point } from '@mytypes/glyphEditor';
import { strokeBoundingBox } from '@utils/svg/svgGeometry';

export function scaleStrokes(
  strokes: Stroke[],
  selectedIds: string[],
  sx: number,
  sy: number,
  origin?: Point,
): Stroke[] {
  if (!selectedIds.length) return strokes;

  const selected = strokes.filter(s => selectedIds.includes(s.id));
  if (!selected.length) return strokes;

  let center: Point;
  if (origin) {
    center = origin;
  } else {
    // bounding box center der Selektion
    const xs: number[] = [];
    const ys: number[] = [];
    selected.forEach(s => {
      const box = strokeBoundingBox(s);
      xs.push(box.minX, box.maxX);
      ys.push(box.minY, box.maxY);
    });
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  const scalePoint = (p: Point): Point => ({
    x: center.x + (p.x - center.x) * sx,
    y: center.y + (p.y - center.y) * sy,
  });

  return strokes.map(s => {
    if (!selectedIds.includes(s.id)) return s;
    const scaled: Stroke = {
      ...s,
      p0: scalePoint(s.p0),
      p1: scalePoint(s.p1),
    };
    if (s.ctrl) {
      scaled.ctrl = scalePoint(s.ctrl);
    }
    return scaled;
  });
}

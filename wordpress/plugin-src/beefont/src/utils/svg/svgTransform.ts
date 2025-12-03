// src/utils/svg/svgTransform.ts

import type { Point, Stroke } from '@mytypes/glyphEditor';

/**
 * Internal helper: deep-clone a stroke.
 */
function cloneStroke(s: Stroke): Stroke {
  return {
    id: s.id,
    width: s.width,
    p0: { ...s.p0 },
    p1: { ...s.p1 },
    ...(s.ctrl ? { ctrl: { ...s.ctrl } } : {}),
  };
}

/**
 * Translate a set of strokes by (dx, dy), but only for those whose IDs are
 * in selectedIds. Non-selected strokes are returned unchanged.
 */
export function translateSelection(
  strokes: Stroke[],
  selectedIds: string[],
  dx: number,
  dy: number,
): Stroke[] {
  if (!selectedIds.length || (!dx && !dy)) {
    return strokes;
  }

  const selectedSet = new Set(selectedIds);

  return strokes.map(s => {
    if (!selectedSet.has(s.id)) {
      return s;
    }

    const next: Stroke = cloneStroke(s);

    next.p0.x += dx;
    next.p0.y += dy;
    next.p1.x += dx;
    next.p1.y += dy;

    if (next.ctrl) {
      next.ctrl.x += dx;
      next.ctrl.y += dy;
    }

    return next;
  });
}

/**
 * Options for scaling the selected strokes.
 *
 * scaleX / scaleY: factors relative to the origin (1 = unchanged).
 * origin:          the point to scale around (e.g. selection center);
 *                  if omitted, (0,0) is used.
 */
export type ScaleSelectionOptions = {
  scaleX: number;
  scaleY: number;
  origin?: Point;
};

/**
 * Scale the selected strokes around a given origin.
 *
 * - Only strokes whose ID is in selectedIds are changed.
 * - Non-selected strokes pass through unchanged.
 *
 * This is meant to be applied as a *single* undo-step:
 *   setStrokes(prev => scaleSelection(prev, selectedIds, { ... }))
 */
export function scaleSelection(
  strokes: Stroke[],
  selectedIds: string[],
  options: ScaleSelectionOptions,
): Stroke[] {
  const { scaleX, scaleY, origin } = options;

  if (!selectedIds.length) return strokes;
  if (scaleX === 1 && scaleY === 1) return strokes;

  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const selectedSet = new Set(selectedIds);

  const scalePoint = (p: Point): Point => ({
    x: ox + (p.x - ox) * scaleX,
    y: oy + (p.y - oy) * scaleY,
  });

  return strokes.map(s => {
    if (!selectedSet.has(s.id)) {
      return s;
    }

    const next: Stroke = cloneStroke(s);

    next.p0 = scalePoint(next.p0);
    next.p1 = scalePoint(next.p1);

    if (next.ctrl) {
      next.ctrl = scalePoint(next.ctrl);
    }

    return next;
  });
}

// src/utils/svgGeometry.ts

import type { Point, Stroke } from '@mytypes/glyphEditor';

/**
 * Euclidean distance between 2 points.
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Midpoint between two points.
 */
export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/**
 * Bounding box of a stroke, including control point if present.
 */
export function strokeBoundingBox(s: Stroke) {
  const xs = [s.p0.x, s.p1.x];
  const ys = [s.p0.y, s.p1.y];

  if (s.ctrl) {
    xs.push(s.ctrl.x);
    ys.push(s.ctrl.y);
  }

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Center of the stroke's bounding box.
 */
export function strokeCenter(s: Stroke): Point {
  const { minX, maxX, minY, maxY } = strokeBoundingBox(s);
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

/**
 * Whether a point lies inside a given rectangle.
 */
export function pointInRect(
  p: Point,
  rect: { x1: number; y1: number; x2: number; y2: number },
): boolean {
  return (
    p.x >= rect.x1 &&
    p.x <= rect.x2 &&
    p.y >= rect.y1 &&
    p.y <= rect.y2
  );
}

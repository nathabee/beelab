// src/utils/svg/svgGeometry.ts

import type { Point, Stroke } from '@mytypes/glyphEditor';

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
 * Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Bounding box of a stroke (includes control point if present).
 */
export function strokeBoundingBox(s: Stroke) {
  const xs = [s.p0.x, s.p1.x];
  const ys = [s.p0.y, s.p1.y];

  if (s.ctrl) {
    xs.push(s.ctrl.x);
    ys.push(s.ctrl.y);
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return { minX, maxX, minY, maxY };
}

/**
 * Center of a stroke's bounding box.
 */
export function strokeCenter(s: Stroke): Point {
  const { minX, maxX, minY, maxY } = strokeBoundingBox(s);
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

/**
 * Check if a point lies within a rectangle.
 * Rectangle is given by (x1,y1) – (x2,y2), any ordering.
 */
export function pointInRect(
  p: Point,
  rect: { x1: number; y1: number; x2: number; y2: number },
): boolean {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);

  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

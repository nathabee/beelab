// src/components/LogisticMapStatsCard.tsx
'use client';

import React, { useMemo } from 'react';
import { useLogisticMap } from '@context/LogisticMapContext';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 180;
const PADDING = 28;

type Scale = {
  x: (step: number) => number;
  y: (value: number) => number;
};

function buildScales(points: number[]): Scale {
  const n = points.length;
  const minStep = 0;
  const maxStep = Math.max(1, n - 1);

  const innerWidth = SVG_WIDTH - 2 * PADDING;
  const innerHeight = SVG_HEIGHT - 2 * PADDING;

  const x = (step: number) => {
    if (maxStep === minStep) {
      return PADDING + innerWidth / 2;
    }
    const t = (step - minStep) / (maxStep - minStep);
    return PADDING + t * innerWidth;
  };

  // x in [0,1] → invert for SVG
  const y = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    return SVG_HEIGHT - PADDING - v * innerHeight;
  };

  return { x, y };
}

function buildPath(points: number[], scale: Scale): string | null {
  if (!points.length) return null;
  return points
    .map((v, idx) => {
      const xx = scale.x(idx);
      const yy = scale.y(v);
      return `${idx === 0 ? 'M' : 'L'}${xx},${yy}`;
    })
    .join(' ');
}

const LogisticMapStatsCard: React.FC = () => {
  const { state } = useLogisticMap();
  const { points, r, x0, generation, maxSteps } = state;

  if (!points.length) {
    return (
      <div className="card">
        <div className="card-body small text-muted">
          No data yet. Choose parameters, then press Step or Play to generate an orbit.
        </div>
      </div>
    );
  }

  const { minX, maxX, meanX, lastX } = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let sum = 0;
    for (const v of points) {
      if (v < minX) minX = v;
      if (v > maxX) maxX = v;
      sum += v;
    }
    const meanX = sum / points.length;
    const lastX = points[points.length - 1];
    // Clamp into [0,1] just in case of rounding
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    return {
      minX: clamp(minX),
      maxX: clamp(maxX),
      meanX: clamp(meanX),
      lastX: clamp(lastX),
    };
  }, [points]);

  const scale = buildScales(points);
  const path = buildPath(points, scale);

  const firstStep = 0;
  const lastStep = Math.max(0, points.length - 1);

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 mb-3">Logistic map statistics</h2>

        <div className="mb-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="180"
            role="img"
            aria-label="Logistic map orbit x_n over iteration steps"
          >
            {/* axes */}
            <line
              x1={PADDING}
              y1={SVG_HEIGHT - PADDING}
              x2={SVG_WIDTH - PADDING}
              y2={SVG_HEIGHT - PADDING}
              stroke="#ccc"
              strokeWidth={1}
            />
            <line
              x1={PADDING}
              y1={PADDING}
              x2={PADDING}
              y2={SVG_HEIGHT - PADDING}
              stroke="#ccc"
              strokeWidth={1}
            />

            {/* y-ticks at 0, 0.25, 0.5, 0.75, 1 */}
            {[0, 0.25, 0.5, 0.75, 1].map(v => {
              const y = scale.y(v);
              return (
                <g key={v}>
                  <line
                    x1={PADDING}
                    y1={y}
                    x2={SVG_WIDTH - PADDING}
                    y2={y}
                    stroke={v === 0 || v === 1 ? '#ddd' : '#f0f0f0'}
                    strokeWidth={v === 0 || v === 1 ? 1 : 0.5}
                  />
                  <text
                    x={PADDING - 4}
                    y={y}
                    fontSize="10"
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="#666"
                  >
                    {v.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* x-axis labels */}
            <text
              x={PADDING}
              y={SVG_HEIGHT - PADDING + 16}
              fontSize="10"
              textAnchor="start"
              fill="#666"
            >
              n = {firstStep}
            </text>
            <text
              x={SVG_WIDTH - PADDING}
              y={SVG_HEIGHT - PADDING + 16}
              fontSize="10"
              textAnchor="end"
              fill="#666"
            >
              n = {lastStep}
            </text>

            {/* orbit path */}
            {path && (
              <path
                d={path}
                fill="none"
                stroke="#0d6efd"
                strokeWidth={1.5}
              />
            )}
          </svg>
        </div>

        <dl className="row mb-0 small">
          <dt className="col-6">Parameter r</dt>
          <dd className="col-6 mb-1 text-end">{r.toFixed(4)}</dd>

          <dt className="col-6">Initial x₀</dt>
          <dd className="col-6 mb-1 text-end">{x0.toFixed(4)}</dd>

          <dt className="col-6">Steps computed</dt>
          <dd className="col-6 mb-1 text-end">
            {generation} / {maxSteps}
          </dd>

          <dt className="col-6">Current xₙ</dt>
          <dd className="col-6 mb-1 text-end">{lastX.toFixed(4)}</dd>

          <dt className="col-6">Min x</dt>
          <dd className="col-6 mb-1 text-end">{minX.toFixed(4)}</dd>

          <dt className="col-6">Max x</dt>
          <dd className="col-6 mb-1 text-end">{maxX.toFixed(4)}</dd>

          <dt className="col-6">Mean x</dt>
          <dd className="col-6 mb-1 text-end">{meanX.toFixed(4)}</dd>
        </dl>
      </div>
    </div>
  );
};

export default LogisticMapStatsCard;

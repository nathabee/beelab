// src/components/DiffusionStatsCard.tsx
'use client';

import React from 'react';
import { useDiffusion } from '@context/DiffusionContext';
import type { DiffusionStatPoint } from '@context/DiffusionContext';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 180;
const PADDING = 28;

type Scale = {
  x: (gen: number) => number;
  y: (value: number) => number;
};

function buildScales(points: DiffusionStatPoint[]): Scale {
  const gens = points.map(p => p.generation);
  const minGen = Math.min(...gens);
  const maxGen = Math.max(...gens);

  const allValues: number[] = [];
  for (const p of points) {
    allValues.push(p.min, p.max, p.avg);
  }

  let minVal = Math.min(...allValues, 0);
  let maxVal = Math.max(...allValues, 1);
  if (!Number.isFinite(minVal)) minVal = 0;
  if (!Number.isFinite(maxVal)) maxVal = 1;
  if (maxVal === minVal) {
    maxVal = minVal + 1;
  }

  const innerWidth = SVG_WIDTH - 2 * PADDING;
  const innerHeight = SVG_HEIGHT - 2 * PADDING;

  const x = (gen: number) => {
    if (maxGen === minGen) {
      return PADDING + innerWidth / 2;
    }
    return (
      PADDING + ((gen - minGen) / (maxGen - minGen)) * innerWidth
    );
  };

  const y = (value: number) => {
    return (
      SVG_HEIGHT -
      PADDING -
      ((value - minVal) / (maxVal - minVal)) * innerHeight
    );
  };

  return { x, y };
}

function buildPath(
  points: DiffusionStatPoint[],
  pick: (p: DiffusionStatPoint) => number,
  scale: Scale,
): string | null {
  if (!points.length) return null;
  return points
    .map((p, idx) => {
      const xx = scale.x(p.generation);
      const yy = scale.y(pick(p));
      return `${idx === 0 ? 'M' : 'L'}${xx},${yy}`;
    })
    .join(' ');
}

const DiffusionStatsCard: React.FC = () => {
  const { state } = useDiffusion();
  const { statsHistory, gridWidth, gridHeight } = state;

  if (!statsHistory.length) {
    return (
      <div className="card">
        <div className="card-body small text-muted">
          No statistics yet. Start the simulation or generate a random field to track diffusion over time.
        </div>
      </div>
    );
  }

  const points = statsHistory;
  const last = points[points.length - 1];
  const first = points[0];

  const scale = buildScales(points);

  const avgPath = buildPath(points, p => p.avg, scale);
  const minPath = buildPath(points, p => p.min, scale);
  const maxPath = buildPath(points, p => p.max, scale);
  const rangePath = buildPath(points, p => p.max - p.min, scale);

  const deltaAvg = last.avg - first.avg;
  const massFirst = first.avg * gridWidth * gridHeight;
  const massLast = last.avg * gridWidth * gridHeight;
  const deltaMass = massLast - massFirst;

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 mb-3">Diffusion statistics</h2>

        <div className="mb-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="180"
            role="img"
            aria-label="Diffusion statistics over generations"
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

            {/* curves */}
            {avgPath && (
              <path
                d={avgPath}
                fill="none"
                stroke="#0d6efd" // avg: blue
                strokeWidth={2}
              />
            )}
            {minPath && (
              <path
                d={minPath}
                fill="none"
                stroke="#198754" // min: green
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
            {maxPath && (
              <path
                d={maxPath}
                fill="none"
                stroke="#dc3545" // max: red
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
            {rangePath && (
              <path
                d={rangePath}
                fill="none"
                stroke="#6c757d" // range: grey
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            )}

            {/* basic x labels */}
            <text
              x={PADDING}
              y={SVG_HEIGHT - PADDING + 16}
              fontSize="10"
              textAnchor="start"
              fill="#666"
            >
              Gen {first.generation}
            </text>
            <text
              x={SVG_WIDTH - PADDING}
              y={SVG_HEIGHT - PADDING + 16}
              fontSize="10"
              textAnchor="end"
              fill="#666"
            >
              Gen {last.generation}
            </text>

            {/* legend */}
            <g transform={`translate(${PADDING}, ${PADDING - 10})`}>
              {/* avg */}
              <line
                x1={0}
                y1={0}
                x2={16}
                y2={0}
                stroke="#0d6efd"
                strokeWidth={2}
              />
              <text x={20} y={3} fontSize="10" fill="#333">
                avg
              </text>

              {/* min */}
              <line
                x1={60}
                y1={0}
                x2={76}
                y2={0}
                stroke="#198754"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text x={80} y={3} fontSize="10" fill="#333">
                min
              </text>

              {/* max */}
              <line
                x1={120}
                y1={0}
                x2={136}
                y2={0}
                stroke="#dc3545"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text x={140} y={3} fontSize="10" fill="#333">
                max
              </text>

              {/* range */}
              <line
                x1={180}
                y1={0}
                x2={196}
                y2={0}
                stroke="#6c757d"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text x={200} y={3} fontSize="10" fill="#333">
                max−min
              </text>
            </g>
          </svg>
        </div>

        <dl className="row mb-0 small">
          <dt className="col-6">Last generation</dt>
          <dd className="col-6 mb-1 text-end">{last.generation}</dd>

          <dt className="col-6">avg (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.avg.toFixed(3)}
          </dd>

          <dt className="col-6">min / max (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.min.toFixed(3)} / {last.max.toFixed(3)}
          </dd>

          <dt className="col-6">Δ avg (run)</dt>
          <dd className="col-6 mb-1 text-end">
            {deltaAvg >= 0 ? `+${deltaAvg.toFixed(3)}` : deltaAvg.toFixed(3)}
          </dd>

          <dt className="col-6">Mass (first / last)</dt>
          <dd className="col-6 mb-1 text-end">
            {massFirst.toFixed(2)} / {massLast.toFixed(2)}
          </dd>

          <dt className="col-6">Δ mass (run)</dt>
          <dd className="col-6 mb-1 text-end">
            {deltaMass >= 0
              ? `+${deltaMass.toFixed(2)}`
              : deltaMass.toFixed(2)}
          </dd>
        </dl>
      </div>
    </div>
  );
};

export default DiffusionStatsCard;

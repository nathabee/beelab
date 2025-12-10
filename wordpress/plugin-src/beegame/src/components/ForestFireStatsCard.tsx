// src/components/ForestFireStatsCard.tsx
'use client';

import React from 'react';
import { useForestFire } from '@context/ForestFireContext';
import type { ForestFireStatPoint } from '@context/ForestFireContext';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 180;
const PADDING = 28;

type Scale = {
  x: (gen: number) => number;
  y: (value: number) => number;
};

function buildScales(points: ForestFireStatPoint[]): Scale {
  const gens = points.map(p => p.generation);
  const minGen = Math.min(...gens);
  const maxGen = Math.max(...gens);

  const innerWidth = SVG_WIDTH - 2 * PADDING;
  const innerHeight = SVG_HEIGHT - 2 * PADDING;

  const x = (gen: number) => {
    if (maxGen === minGen) {
      return PADDING + innerWidth / 2;
    }
    return PADDING + ((gen - minGen) / (maxGen - minGen)) * innerWidth;
  };

  const y = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    return SVG_HEIGHT - PADDING - v * innerHeight;
  };

  return { x, y };
}

function buildPath(
  points: ForestFireStatPoint[],
  pick: (p: ForestFireStatPoint) => number,
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

const ForestFireStatsCard: React.FC = () => {
  const { state } = useForestFire();
  const { statsHistory, gridWidth, gridHeight } = state;

  if (!statsHistory.length) {
    return (
      <div className="card">
        <div className="card-body small text-muted">
          No statistics yet. Seed a forest and start the simulation to see how tree cover and fires evolve.
        </div>
      </div>
    );
  }

  const points = statsHistory;
  const first = points[0];
  const last = points[points.length - 1];

  const scale = buildScales(points);

  const pathTree = buildPath(points, p => p.fracTree, scale);
  const pathBurn = buildPath(points, p => p.fracBurning, scale);

  const N = gridWidth * gridHeight || 1;

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 mb-3">Forest statistics</h2>

        <div className="mb-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="180"
            role="img"
            aria-label="Forest tree and fire fractions over generations"
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

            {/* y labels */}
            <text
              x={PADDING - 4}
              y={SVG_HEIGHT - PADDING}
              fontSize="10"
              textAnchor="end"
              dominantBaseline="middle"
              fill="#666"
            >
              0
            </text>
            <text
              x={PADDING - 4}
              y={PADDING}
              fontSize="10"
              textAnchor="end"
              dominantBaseline="middle"
              fill="#666"
            >
              1
            </text>

            {/* x labels */}
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

            {/* curves */}
            {pathTree && (
              <path
                d={pathTree}
                fill="none"
                stroke="#198754" // trees: green
                strokeWidth={2}
              />
            )}
            {pathBurn && (
              <path
                d={pathBurn}
                fill="none"
                stroke="#dc3545" // burning: red
                strokeWidth={1.5}
              />
            )}

            {/* legend */}
            <g transform={`translate(${PADDING}, ${PADDING - 10})`}>
              <line
                x1={0}
                y1={0}
                x2={16}
                y2={0}
                stroke="#198754"
                strokeWidth={2}
              />
              <text x={20} y={3} fontSize="10" fill="#333">
                tree fraction
              </text>

              <line
                x1={130}
                y1={0}
                x2={146}
                y2={0}
                stroke="#dc3545"
                strokeWidth={1.5}
              />
              <text x={150} y={3} fontSize="10" fill="#333">
                burning fraction
              </text>
            </g>
          </svg>
        </div>

        <dl className="row mb-0 small">
          <dt className="col-6">Grid size</dt>
          <dd className="col-6 mb-1 text-end">
            {gridWidth} × {gridHeight} ({N} cells)
          </dd>

          <dt className="col-6">Last generation</dt>
          <dd className="col-6 mb-1 text-end">{last.generation}</dd>

          <dt className="col-6">Trees (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.treeCount} ({(last.fracTree * 100).toFixed(1)}%)
          </dd>

          <dt className="col-6">Burning (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.burningCount} ({(last.fracBurning * 100).toFixed(2)}%)
          </dd>

          <dt className="col-6">Empty (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.emptyCount} ({(last.fracEmpty * 100).toFixed(1)}%)
          </dd>
        </dl>
      </div>
    </div>
  );
};

export default ForestFireStatsCard;

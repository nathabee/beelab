// src/components/EpidemicSpreadStatsCard.tsx
'use client';

import React from 'react';
import { useEpidemicSpread } from '@context/EpidemicSpreadContext';
import type { EpidemicStatPoint } from '@context/EpidemicSpreadContext';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 180;
const PADDING = 28;

type Scale = {
  x: (gen: number) => number;
  y: (value: number) => number;
};

function buildScales(points: EpidemicStatPoint[]): Scale {
  const gens = points.map(p => p.generation);
  const minGen = Math.min(...gens);
  const maxGen = Math.max(...gens);

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

  // fractions are in [0, 1]
  const y = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    return SVG_HEIGHT - PADDING - v * innerHeight;
  };

  return { x, y };
}

function buildPath(
  points: EpidemicStatPoint[],
  pick: (p: EpidemicStatPoint) => number,
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

const EpidemicSpreadStatsCard: React.FC = () => {
  const { state } = useEpidemicSpread();
  const { statsHistory, gridWidth, gridHeight } = state;

  if (!statsHistory.length) {
    return (
      <div className="card">
        <div className="card-body small text-muted">
          No statistics yet. Seed the grid and start the simulation to see how S, I and R evolve over time.
        </div>
      </div>
    );
  }

  const points = statsHistory;
  const first = points[0];
  const last = points[points.length - 1];
  const scale = buildScales(points);

  const pathS = buildPath(points, p => p.fracS, scale);
  const pathI = buildPath(points, p => p.fracI, scale);
  const pathR = buildPath(points, p => p.fracR, scale);

  const N = gridWidth * gridHeight || 1;

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 mb-3">Epidemic statistics</h2>

        <div className="mb-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="180"
            role="img"
            aria-label="Epidemic SIR fractions over generations"
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
            {pathS && (
              <path
                d={pathS}
                fill="none"
                stroke="#0d6efd" // susceptible: blue
                strokeWidth={1.5}
              />
            )}
            {pathI && (
              <path
                d={pathI}
                fill="none"
                stroke="#dc3545" // infected: red
                strokeWidth={2}
              />
            )}
            {pathR && (
              <path
                d={pathR}
                fill="none"
                stroke="#198754" // recovered: green
                strokeWidth={1.5}
              />
            )}

            {/* legend */}
            <g transform={`translate(${PADDING}, ${PADDING - 10})`}>
              {/* S */}
              <line
                x1={0}
                y1={0}
                x2={16}
                y2={0}
                stroke="#0d6efd"
                strokeWidth={1.5}
              />
              <text x={20} y={3} fontSize="10" fill="#333">
                S fraction
              </text>

              {/* I */}
              <line
                x1={100}
                y1={0}
                x2={116}
                y2={0}
                stroke="#dc3545"
                strokeWidth={2}
              />
              <text x={120} y={3} fontSize="10" fill="#333">
                I fraction
              </text>

              {/* R */}
              <line
                x1={190}
                y1={0}
                x2={206}
                y2={0}
                stroke="#198754"
                strokeWidth={1.5}
              />
              <text x={210} y={3} fontSize="10" fill="#333">
                R fraction
              </text>
            </g>
          </svg>
        </div>

        <dl className="row mb-0 small">
          <dt className="col-6">Population size</dt>
          <dd className="col-6 mb-1 text-end">{N}</dd>

          <dt className="col-6">Last generation</dt>
          <dd className="col-6 mb-1 text-end">{last.generation}</dd>

          <dt className="col-6">S (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.susceptible} ({(last.fracS * 100).toFixed(1)}%)
          </dd>

          <dt className="col-6">I (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.infected} ({(last.fracI * 100).toFixed(1)}%)
          </dd>

          <dt className="col-6">R (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.recovered} ({(last.fracR * 100).toFixed(1)}%)
          </dd>
        </dl>
      </div>
    </div>
  );
};

export default EpidemicSpreadStatsCard;

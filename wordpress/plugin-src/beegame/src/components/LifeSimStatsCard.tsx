// src/components/LifeSimStatsCard.tsx
'use client';

import React from 'react';
import { useLifeSim } from '@context/LifeSimContext';
import type { LifeStatPoint } from '@context/LifeSimContext';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 180;
const PADDING = 28;

type Scale = {
  x: (gen: number) => number;
  y: (value: number) => number;
};

function buildScales(points: LifeStatPoint[]): Scale {
  const gens = points.map(p => p.generation);
  const minGen = Math.min(...gens);
  const maxGen = Math.max(...gens);

  // include all metrics so they share one Y scale
  const allValues: number[] = [];
  for (const p of points) {
    allValues.push(p.aliveCount, p.births, p.deaths);
  }

  let minVal = 0;
  let maxVal = Math.max(...allValues, 1);
  if (maxVal === 0) maxVal = 1; // avoid divide-by-zero

  const innerWidth = SVG_WIDTH - 2 * PADDING;
  const innerHeight = SVG_HEIGHT - 2 * PADDING;

  const x = (gen: number) => {
    if (maxGen === minGen) {
      return PADDING + innerWidth / 2;
    }
    return (
      PADDING +
      ((gen - minGen) / (maxGen - minGen)) * innerWidth
    );
  };

  const y = (value: number) => {
    if (maxVal === minVal) {
      return SVG_HEIGHT - PADDING;
    }
    // larger values -> higher on screen
    return (
      SVG_HEIGHT -
      PADDING -
      ((value - minVal) / (maxVal - minVal)) * innerHeight
    );
  };

  return { x, y };
}

function buildPath(points: LifeStatPoint[], metric: keyof LifeStatPoint, scale: Scale): string | null {
  if (!points.length) return null;

  return points
    .map((p, idx) => {
      const x = scale.x(p.generation);
      const y = scale.y(p[metric] as number);
      return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

const LifeSimStatsCard: React.FC = () => {
  const { state } = useLifeSim();
  const { statsHistory } = state;

  if (!statsHistory.length) {
    return (
      <div className="card">
        <div className="card-body small text-muted">
          No statistics yet. Start the simulation or apply a preset to see how the population evolves over time.
        </div>
      </div>
    );
  }

  const points = statsHistory;

  const scale = buildScales(points);

  const alivePath = buildPath(points, 'aliveCount', scale);
  const birthsPath = buildPath(points, 'births', scale);
  const deathsPath = buildPath(points, 'deaths', scale);

  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : last;
  const deltaAlive = last.aliveCount - prev.aliveCount;

  const maxAlive = Math.max(...points.map(p => p.aliveCount));
  const minAlive = Math.min(...points.map(p => p.aliveCount));

  const maxGen = last.generation;

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 mb-3">Population graph</h2>

        <div className="mb-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="180"
            role="img"
            aria-label="Population statistics over generations"
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

            {/* main curves */}
            {alivePath && (
              <path
                d={alivePath}
                fill="none"
                stroke="#0d6efd" // alive: blue
                strokeWidth={2}
              />
            )}
            {birthsPath && (
              <path
                d={birthsPath}
                fill="none"
                stroke="#198754" // births: green
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
            {deathsPath && (
              <path
                d={deathsPath}
                fill="none"
                stroke="#dc3545" // deaths: red
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}

            {/* basic tick labels (x-axis: 0 and last gen; y-axis: 0 and max alive) */}
            {/* x-axis labels */}
            <text
              x={PADDING}
              y={SVG_HEIGHT - PADDING + 16}
              fontSize="10"
              textAnchor="start"
              fill="#666"
            >
              0
            </text>
            <text
              x={SVG_WIDTH - PADDING}
              y={SVG_HEIGHT - PADDING + 16}
              fontSize="10"
              textAnchor="end"
              fill="#666"
            >
              Gen {maxGen}
            </text>

            {/* y-axis labels */}
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
              {maxAlive}
            </text>

            {/* legend */}
            <g transform={`translate(${PADDING}, ${PADDING - 10})`}>
              {/* alive */}
              <line
                x1={0}
                y1={0}
                x2={16}
                y2={0}
                stroke="#0d6efd"
                strokeWidth={2}
              />
              <text x={20} y={3} fontSize="10" fill="#333">
                Alive
              </text>

              {/* births */}
              <line
                x1={80}
                y1={0}
                x2={96}
                y2={0}
                stroke="#198754"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text x={100} y={3} fontSize="10" fill="#333">
                Births
              </text>

              {/* deaths */}
              <line
                x1={150}
                y1={0}
                x2={166}
                y2={0}
                stroke="#dc3545"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text x={170} y={3} fontSize="10" fill="#333">
                Deaths
              </text>
            </g>
          </svg>
        </div>

        {/* compact textual summary under the chart */}
        <dl className="row mb-0 small">
          <dt className="col-6">Last generation</dt>
          <dd className="col-6 mb-1 text-end">{last.generation}</dd>

          <dt className="col-6">Alive (current)</dt>
          <dd className="col-6 mb-1 text-end">{last.aliveCount}</dd>

          <dt className="col-6">Alive (max)</dt>
          <dd className="col-6 mb-1 text-end">{maxAlive}</dd>

          <dt className="col-6">Alive (min)</dt>
          <dd className="col-6 mb-1 text-end">{minAlive}</dd>

          <dt className="col-6">Δ alive (last step)</dt>
          <dd className="col-6 mb-1 text-end">
            {deltaAlive > 0 ? `+${deltaAlive}` : deltaAlive}
          </dd>
        </dl>
      </div>
    </div>
  );
};

export default LifeSimStatsCard;

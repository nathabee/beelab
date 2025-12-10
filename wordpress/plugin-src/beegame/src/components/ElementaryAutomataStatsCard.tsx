// src/components/ElementaryAutomataStatsCard.tsx
'use client';

import React from 'react';
import { useElementaryAutomata } from '@context/ElementaryAutomataContext';
import type { ElementaryStatPoint } from '@context/ElementaryAutomataContext';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 180;
const PADDING = 28;

type Scale = {
  x: (gen: number) => number;
  y: (value: number) => number;
};

function buildScales(points: ElementaryStatPoint[]): Scale {
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

  // values are fractions in [0, 1]
  const y = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    return SVG_HEIGHT - PADDING - v * innerHeight;
  };

  return { x, y };
}

function buildPath(
  points: ElementaryStatPoint[],
  pick: (p: ElementaryStatPoint) => number,
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

const ElementaryAutomataStatsCard: React.FC = () => {
  const { state } = useElementaryAutomata();
  const { statsHistory, width, rule } = state;

  if (!statsHistory.length) {
    return (
      <div className="card">
        <div className="card-body small text-muted">
          No statistics yet. Seed an initial row and start the automaton to see how density and structure evolve.
        </div>
      </div>
    );
  }

  const points = statsHistory;
  const first = points[0];
  const last = points[points.length - 1];

  const scale = buildScales(points);

  const alivePath = buildPath(points, p => p.aliveFraction, scale);
  const transPath = buildPath(points, p => p.transitionsFraction, scale);

  const deltaAlive = last.aliveFraction - first.aliveFraction;
  const deltaTrans = last.transitionsFraction - first.transitionsFraction;

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h6 mb-3">Automaton statistics</h2>

        <div className="mb-2">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="180"
            role="img"
            aria-label="Elementary cellular automaton statistics"
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

            {/* y-axis labels 0 and 1 */}
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

            {/* x-axis labels */}
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
            {alivePath && (
              <path
                d={alivePath}
                fill="none"
                stroke="#0d6efd" // alive fraction: blue
                strokeWidth={2}
              />
            )}
            {transPath && (
              <path
                d={transPath}
                fill="none"
                stroke="#fd7e14" // transitions fraction: orange
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}

            {/* legend */}
            <g transform={`translate(${PADDING}, ${PADDING - 10})`}>
              <line
                x1={0}
                y1={0}
                x2={16}
                y2={0}
                stroke="#0d6efd"
                strokeWidth={2}
              />
              <text x={20} y={3} fontSize="10" fill="#333">
                alive fraction
              </text>

              <line
                x1={130}
                y1={0}
                x2={146}
                y2={0}
                stroke="#fd7e14"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text x={150} y={3} fontSize="10" fill="#333">
                transitions fraction
              </text>
            </g>
          </svg>
        </div>

        <dl className="row mb-0 small">
          <dt className="col-6">Rule</dt>
          <dd className="col-6 mb-1 text-end">{rule}</dd>

          <dt className="col-6">Row width</dt>
          <dd className="col-6 mb-1 text-end">{width}</dd>

          <dt className="col-6">Last generation</dt>
          <dd className="col-6 mb-1 text-end">{last.generation}</dd>

          <dt className="col-6">Alive (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.aliveCount} ({(last.aliveFraction * 100).toFixed(1)}%)
          </dd>

          <dt className="col-6">Transitions (current)</dt>
          <dd className="col-6 mb-1 text-end">
            {last.transitions} ({(last.transitionsFraction * 100).toFixed(1)}%)
          </dd>

          <dt className="col-6">Δ alive fraction</dt>
          <dd className="col-6 mb-1 text-end">
            {deltaAlive >= 0
              ? `+${(deltaAlive * 100).toFixed(1)}%`
              : `${(deltaAlive * 100).toFixed(1)}%`}
          </dd>

          <dt className="col-6">Δ transitions fraction</dt>
          <dd className="col-6 mb-1 text-end">
            {deltaTrans >= 0
              ? `+${(deltaTrans * 100).toFixed(1)}%`
              : `${(deltaTrans * 100).toFixed(1)}%`}
          </dd>
        </dl>
      </div>
    </div>
  );
};

export default ElementaryAutomataStatsCard;

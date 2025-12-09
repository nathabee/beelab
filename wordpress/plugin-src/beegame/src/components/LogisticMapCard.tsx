// src/components/LogisticMapCard.tsx
'use client';

import React from 'react';
import { useLogisticMap } from '@context/LogisticMapContext';

const LogisticMapCard: React.FC = () => {
  const { state } = useLogisticMap();

  const { r, x0, points, generation, isRunning, maxSteps } = state;

  if (!points.length) {
    return null;
  }

  const nPoints = points.length;

  // Build polyline points in a normalized 0–100 × 0–100 viewBox.
  const polylinePoints = points
    .map((x, idx) => {
      const t = nPoints === 1 ? 0 : idx / (nPoints - 1);
      const px = t * 100;
      const py = (1 - x) * 100; // x in [0,1] → invert for SVG
      return `${px},${py}`;
    })
    .join(' ');

  const currentX = points[points.length - 1];

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <h2 className="h5 mb-0">Logistic Map</h2>
          <small className="text-muted">
            r = {r.toFixed(3)} · x₀ = {x0.toFixed(3)} · steps {generation} / {maxSteps}
          </small>
        </div>

        <div className="logistic-chart-wrapper">
          <svg
            className="logistic-chart"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Horizontal grid lines at x = 0, 0.25, 0.5, 0.75, 1 */}
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <line
                key={v}
                x1={0}
                x2={100}
                y1={(1 - v) * 100}
                y2={(1 - v) * 100}
                className={v === 0 || v === 1 ? 'logistic-chart-axis' : 'logistic-chart-grid'}
              />
            ))}

            {/* Polyline for the orbit */}
            {nPoints > 1 && (
              <polyline
                points={polylinePoints}
                className="logistic-line"
              />
            )}

            {/* If only one point, mark it */}
            {nPoints === 1 && (
              <circle
                cx={0}
                cy={(1 - points[0]) * 100}
                r={0.7}
                className="logistic-point"
              />
            )}
          </svg>
        </div>

        <div className="mt-2 small text-muted">
          Current value: <strong>xₙ ≈ {currentX.toFixed(4)}</strong>.{' '}
          {isRunning
            ? 'The map is iterating automatically.'
            : 'Press Play or Step to iterate further.'}
        </div>
      </div>
    </div>
  );
};

export default LogisticMapCard;

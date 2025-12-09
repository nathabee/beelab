// src/components/DiffusionCard.tsx
'use client';

import React from 'react';
import { useDiffusion } from '@context/DiffusionContext';

function valueToColor(value: number): string {
  // clamp 0–1
  const v = Math.max(0, Math.min(1, value));

  // 0 → deep blue, 0.5 → yellow, 1 → red
  const blue = { r: 10, g: 24, b: 66 };
  const yellow = { r: 255, g: 230, b: 128 };
  const red = { r: 180, g: 0, b: 0 };

  let r: number;
  let g: number;
  let b: number;

  if (v <= 0.5) {
    const t = v / 0.5;
    r = blue.r + t * (yellow.r - blue.r);
    g = blue.g + t * (yellow.g - blue.g);
    b = blue.b + t * (yellow.b - blue.b);
  } else {
    const t = (v - 0.5) / 0.5;
    r = yellow.r + t * (red.r - yellow.r);
    g = yellow.g + t * (red.g - yellow.g);
    b = yellow.b + t * (red.b - yellow.b);
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const DiffusionCard: React.FC = () => {
  const { state, actions } = useDiffusion();

  const {
    gridWidth,
    gridHeight,
    field,
    generation,
    minValue,
    maxValue,
    avgValue,
    isRunning,
    boundaryMode,
  } = state;

  const { toggleCell } = actions;

  if (!field.length || gridWidth <= 0 || gridHeight <= 0) {
    return null;
  }

  const handleCellClick = (x: number, y: number) => {
    if (isRunning) return;
    toggleCell(x, y);
  };

 

  const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
  gap: 1,
  border: '1px solid #ccc',
  width: '100%',
  aspectRatio: `${gridWidth} / ${gridHeight}`,
};


  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <h2 className="h5 mb-0">Diffusion / Heat Map</h2>
          <small className="text-muted">
            Gen {generation} · min {minValue.toFixed(2)} · max {maxValue.toFixed(2)} · avg{' '}
            {avgValue.toFixed(2)} ·{' '}
            {boundaryMode === 'toroidal' ? 'Wrapping' : 'Finite'}
          </small>
        </div>

        <div className="diffusion-grid" style={gridStyle}>
          {field.map((row, y) =>
            row.map((val, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className="diffusion-cell"
                style={{ backgroundColor: valueToColor(val) }}
                onClick={() => handleCellClick(x, y)}
                disabled={isRunning}
              />
            )),
          )}
        </div>
      </div>

      <div className="card-footer small text-muted">
        Tip: click cells while paused to toggle between cold and hot sources. Watch heat diffuse
        and cool down over time.
      </div>
    </div>
  );
};

export default DiffusionCard;

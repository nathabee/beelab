// src/components/EpidemicSpreadCard.tsx
'use client';

import React from 'react';
import { useEpidemicSpread, EpidemicCell } from '@context/EpidemicSpreadContext';

const EpidemicSpreadCard: React.FC = () => {
  const { state, actions } = useEpidemicSpread();

  const {
    gridWidth,
    gridHeight,
    cells,
    generation,
    susceptibleCount,
    infectedCount,
    recoveredCount,
    isRunning,
    boundaryMode,
  } = state;

  const { toggleCell } = actions;

  if (!cells.length || gridWidth <= 0 || gridHeight <= 0) {
    return null;
  }

  const handleCellClick = (x: number, y: number) => {
    if (isRunning) return;
    toggleCell(x, y);
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))`,
    gap: 1,
    border: '1px solid #ccc',
    maxHeight: '500px',
    aspectRatio: `${gridWidth} / ${gridHeight}`,
  };

  const getCellClass = (cell: EpidemicCell) => {
    if (cell === 1) return 'epidemic-cell epidemic-cell--infected';
    if (cell === 2) return 'epidemic-cell epidemic-cell--recovered';
    return 'epidemic-cell epidemic-cell--susceptible';
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <h2 className="h5 mb-0">Epidemic Spread (SIR)</h2>
          <small className="text-muted">
            Gen {generation} · S {susceptibleCount} · I {infectedCount} · R{' '}
            {recoveredCount} ·{' '}
            {boundaryMode === 'toroidal' ? 'Wrapping' : 'Finite'}
          </small>
        </div>

        <div className="epidemic-grid" style={gridStyle}>
          {cells.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className={getCellClass(cell)}
                onClick={() => handleCellClick(x, y)}
                disabled={isRunning}
              />
            )),
          )}
        </div>
      </div>

      <div className="card-footer small text-muted">
        Tip: click cells while paused to cycle through susceptible → infected → recovered.
      </div>
    </div>
  );
};

export default EpidemicSpreadCard;

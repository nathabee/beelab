// src/components/ForestFireCard.tsx
'use client';

import React from 'react';
import { useForestFire } from '@context/ForestFireContext';
import type { ForestCellState } from '@context/ForestFireContext';

const ForestFireCard: React.FC = () => {
  const { state, actions } = useForestFire();

  const {
    gridWidth,
    gridHeight,
    cells,
    generation,
    treeCount,
    burningCount,
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

  const getCellClass = (state: ForestCellState) => {
    if (state === 1) return 'forest-cell--tree';
    if (state === 2) return 'forest-cell--burning';
    return 'forest-cell--empty';
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <h2 className="h5 mb-0">Forest Fire</h2>
          <small className="text-muted">
            Gen {generation} · Trees {treeCount} · Burning {burningCount} ·{' '}
            {boundaryMode === 'toroidal' ? 'Wrapping' : 'Finite'}
          </small>
        </div>

        <div className="forest-grid" style={gridStyle}>
          {cells.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className={`forest-cell ${getCellClass(cell)}`}
                onClick={() => handleCellClick(x, y)}
                disabled={isRunning}
              />
            )),
          )}
        </div>

        <div className="mt-2 small text-muted">
          Tip: click cells to cycle between empty → tree → burning while paused.
        </div>
      </div>
    </div>
  );
};

export default ForestFireCard;

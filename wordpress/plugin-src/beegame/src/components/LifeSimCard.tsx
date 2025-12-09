// src/components/LifeSimCard.tsx
'use client';

import React from 'react';
import { useLifeSim } from '@context/LifeSimContext';

const LifeSimCard: React.FC = () => {
  const { state, actions } = useLifeSim();

  const {
    gridWidth,
    gridHeight,
    cells,
    generation,
    aliveCount,
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
    gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
    gap: 1,
    border: '1px solid #ccc',
    width: '100%',
    aspectRatio: `${gridWidth} / ${gridHeight}`,
  };

  const getCellClass = (alive: boolean) =>
    alive ? 'life-cell life-cell--alive' : 'life-cell life-cell--dead';

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <h2 className="h5 mb-0">Game of Life</h2>
          <small className="text-muted">
            Gen {generation} · Alive {aliveCount} ·{' '}
            {boundaryMode === 'toroidal' ? 'Wrapping' : 'Finite'}
          </small>
        </div>

        <div className="life-grid" style={gridStyle}>
          {cells.map((row, y) =>
            row.map((alive, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className={getCellClass(alive)}
                onClick={() => handleCellClick(x, y)}
                disabled={isRunning}
              />
            )),
          )}
        </div>

      </div>
      <div className="mt-2 small text-muted">
        Tip: click cells to toggle alive/dead while paused.
      </div>
    </div>
  );
};

export default LifeSimCard;

// src/components/LifeSimCard.tsx
'use client';

import React from 'react'; 


import { useLifeSim } from '@context/LifeSimContext';

const LifeSimCard: React.FC = () => {
  const { state, actions } = useLifeSim();
  const {
    gridWidth, gridHeight, cells,
    generation, aliveCount, isRunning, boundaryMode,
  } = state;
  const { toggleCell } = actions;

 
  if (!cells.length || gridWidth <= 0 || gridHeight <= 0) {
    return null;
  }

  const handleCellClick = (x: number, y: number) => {
    if (isRunning) return; // no editing while running
    toggleCell(x, y);
  };

  // Simple responsive grid; each cell is a square-ish button
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))`,
    gap: 1,
    border: '1px solid #ccc',
    maxHeight: '500px',
    aspectRatio: `${gridWidth} / ${gridHeight}`, // keeps overall shape consistent
  };

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
                className={`life-cell ${alive ? 'life-cell--alive' : 'life-cell--dead'
                  }`}
                onClick={() => handleCellClick(x, y)}
                disabled={isRunning}
              />
            )),
          )}
        </div> 
 

      </div>

    </div>
  );
};

export default LifeSimCard;

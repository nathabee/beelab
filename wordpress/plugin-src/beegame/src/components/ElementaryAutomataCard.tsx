// src/components/ElementaryAutomataCard.tsx
'use client';

import React from 'react';
import { useElementaryAutomata } from '@context/ElementaryAutomataContext';

const MAX_VISIBLE_ROWS = 80; // tweak as you like

const ElementaryAutomataCard: React.FC = () => {
  const { state, actions } = useElementaryAutomata();

  const {
    width,
    history,
    generation,
    isRunning,
    boundaryMode,
    rule,
    aliveCount,
  } = state;

  const { toggleCell } = actions;

  if (!history.length || width <= 0) {
    return null;
  }

  // Only show the last N generations → looks like the view scrolls
  const visibleHistory =
    history.length > MAX_VISIBLE_ROWS
      ? history.slice(history.length - MAX_VISIBLE_ROWS)
      : history;

  const height = visibleHistory.length;
  const lastRowIndex = height - 1;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
    gap: 1,
    border: '1px solid #ccc',
    /* Use the whole card for the currently visible slice */
    aspectRatio: `${width} / ${height}`,
    maxHeight: '500px',
    overflow: 'hidden',
  };

  const getCellClass = (alive: boolean, isLastRow: boolean) => {
    const base = alive ? 'life-cell life-cell--alive' : 'life-cell life-cell--dead';
    return isLastRow ? `${base} eca-cell--current` : `${base} eca-cell--history`;
  };

  const handleCellClick = (x: number, y: number) => {
    if (isRunning) return;
    if (y !== lastRowIndex) return; // only the bottom row editable
    toggleCell(x);
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <h2 className="h5 mb-0">Elementary Cellular Automaton</h2>
          <small className="text-muted">
            Rule {rule} · Gen {generation} · Alive in last row {aliveCount} ·{' '}
            {boundaryMode === 'toroidal' ? 'Wrapping' : 'Finite'}
          </small>
        </div>

        <div className="life-grid eca-grid" style={gridStyle}>
          {visibleHistory.map((row, y) =>
            row.map((alive, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className={getCellClass(alive, y === lastRowIndex)}
                onClick={() => handleCellClick(x, y)}
                disabled={isRunning || y !== lastRowIndex}
              />
            )),
          )}
        </div>

        <div className="mt-2 small text-muted">
          Tip: only the <strong>bottom row</strong> is editable. Old generations are
          gradually pushed off the top as the automaton evolves.
        </div>
      </div>
    </div>
  );
};

export default ElementaryAutomataCard;

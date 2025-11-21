'use client';

// src/components/AlphabetGrid.tsx

import React from 'react';

export type AlphabetCell = {
  char: string;
  isCovered?: boolean; // true = covered, false = missing, undefined = neutral
};

export type AlphabetGridProps = {
  items: AlphabetCell[];
  /**
   * Optional label to show above the grid.
   */
  title?: string;
};

const AlphabetGrid: React.FC<AlphabetGridProps> = ({ items, title }) => {
  if (!items || items.length === 0) {
    return <p>No characters to display.</p>;
  }

  return (
    <section className="bf-alphabet-grid-section">
      {title && <h3 className="bf-alphabet-grid-section__title">{title}</h3>}

      <div className="bf-alphabet-grid">
        {items.map((item, index) => {
          const key = `${item.char}-${index}`;
          const stateClass =
            item.isCovered === undefined
              ? ''
              : item.isCovered
              ? ' bf-alphabet-grid__cell--covered'
              : ' bf-alphabet-grid__cell--missing';

          return (
            <span
              key={key}
              className={`bf-alphabet-grid__cell${stateClass}`}
            >
              {item.char}
            </span>
          );
        })}
      </div>
    </section>
  );
};

export default AlphabetGrid;

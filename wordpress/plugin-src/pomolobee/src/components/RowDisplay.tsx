'use client';

import React from 'react';
import type { Row } from '@mytypes/row';
// import FruitDisplay from '@components/FruitDisplay'; // when you create it

type Props = { row: Row };

const RowDisplay: React.FC<Props> = ({ row }) => {
  return (
    <div className="d-flex justify-content-between align-items-center border rounded px-2 py-1 mb-1">
      <div className="me-2">
        <div className="fw-semibold">{row.short_name} — {row.name}</div>
        <div className="small text-muted">
          Plants: {row.nb_plant} • Fruit: {row.fruit_type} (#{row.fruit_id})
        </div>
      </div>
      {/* When FruitDisplay exists:
      <FruitDisplay fruitId={row.fruit_id} compact />
      */}
    </div>
  );
};

export default RowDisplay;

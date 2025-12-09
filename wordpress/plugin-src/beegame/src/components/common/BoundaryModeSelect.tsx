// src/components/common/BoundaryModeSelect.tsx
'use client';

import React from 'react';

type BoundaryMode = 'finite' | 'toroidal';

type BoundaryModeSelectProps = {
  value: BoundaryMode;
  onChange: (value: BoundaryMode) => void;
};

const BoundaryModeSelect: React.FC<BoundaryModeSelectProps> = ({
  value,
  onChange,
}) => (
  <div className="mb-3">
    <label className="form-label">Boundary mode</label>
    <select
      className="form-select form-select-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as BoundaryMode)}
    >
      <option value="toroidal">Wrapping (torus)</option>
      <option value="finite">Finite (edges)</option>
    </select>
  </div>
);

export default BoundaryModeSelect;

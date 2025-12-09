// src/components/common/GridSizeControl.tsx
'use client';

import React, { useEffect, useState } from 'react';

type GridSizeControlProps = {
  width: number;
  height: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onApply: (w: number, h: number) => void;
};

const GridSizeControl: React.FC<GridSizeControlProps> = ({
  width,
  height,
  min = 5,
  max = 200,
  disabled = false,
  onApply,
}) => {
  const [widthInput, setWidthInput] = useState(width.toString());
  const [heightInput, setHeightInput] = useState(height.toString());

  useEffect(() => {
    setWidthInput(width.toString());
  }, [width]);

  useEffect(() => {
    setHeightInput(height.toString());
  }, [height]);

  const handleApply = () => {
    const w = parseInt(widthInput, 10);
    const h = parseInt(heightInput, 10);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    onApply(w, h);
  };

  return (
    <div className="mb-3">
      <label className="form-label">Grid size (width × height)</label>
      <div className="d-flex gap-2">
        <input
          type="number"
          className="form-control form-control-sm"
          min={min}
          max={max}
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          disabled={disabled}
        />
        <span className="align-self-center">×</span>
        <input
          type="number"
          className="form-control form-control-sm"
          min={min}
          max={max}
          value={heightInput}
          onChange={(e) => setHeightInput(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={handleApply}
          disabled={disabled}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default GridSizeControl;

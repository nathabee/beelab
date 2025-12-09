// src/components/common/SpeedSlider.tsx
'use client';

import React from 'react';

type SpeedSliderProps = {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
};

const SpeedSlider: React.FC<SpeedSliderProps> = ({
  label = 'Speed (ms per step)',
  value,
  min = 50,
  max = 1000,
  step = 10,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val)) return;
    onChange(val);
  };

  return (
    <div className="mb-3">
      <label className="form-label">
        {label}: <strong>{value}</strong>
      </label>
      <input
        type="range"
        className="form-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default SpeedSlider;

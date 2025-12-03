// src/components/SvgGlyphEditor/SvgGlyphMetricsControls.tsx

import React from 'react';

export type SvgGlyphMetricsControlsProps = {
  left: number;
  right: number;
  canvasWidth: number;
  onChangeLeft: (value: number) => void;
  onChangeRight: (value: number) => void;
  onApply: () => void;
};

const SvgGlyphMetricsControls: React.FC<SvgGlyphMetricsControlsProps> = ({
  left,
  right,
  canvasWidth,
  onChangeLeft,
  onChangeRight,
  onApply,
}) => {
  const handleLeftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) return;
    onChangeLeft(raw);
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) return;
    onChangeRight(raw);
  };

  return (
    <div className="bf-glyph-editor__actions">
      <span className="bf-glyph-editor__label">
        Horizontal ink box (left/right in canvas units, 0–{canvasWidth})
      </span>

      <label className="bf-glyph-editor__label bf-glyph-editor__label--inline">
        Left
        <input
          type="number"
          step="1"
          min="0"
          max={canvasWidth}
          className="bf-input bf-input--tiny"
          value={left}
          onChange={handleLeftChange}
        />
      </label>

      <label className="bf-glyph-editor__label bf-glyph-editor__label--inline">
        Right
        <input
          type="number"
          step="1"
          min="0"
          max={canvasWidth}
          className="bf-input bf-input--tiny"
          value={right}
          onChange={handleRightChange}
        />
      </label>

      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onApply}
      >
        Apply width
      </button>
    </div>
  );
};

export default SvgGlyphMetricsControls;

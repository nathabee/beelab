'use client';

// src/components/SvgGlyphEditor/SvgGlyphGridControls.tsx

import React from 'react';
import type { LineFactorsKey } from '@mytypes/glyphEditor';

export type SvgGlyphGridControlsProps = {
  draftLineFactors: Record<LineFactorsKey, number>;

  onDraftChange: (key: LineFactorsKey, value: number) => void;
  onApply: () => void;
  onReset: () => void;
};

const SvgGlyphGridControls: React.FC<SvgGlyphGridControlsProps> = ({
  draftLineFactors,
  onDraftChange,
  onApply,
  onReset,
}) => {
  return (
    <div className="bf-glyph-editor__actions">
      <span className="bf-glyph-editor__label">
        Handwriting lines (0–1 relative to height)
      </span>

      {(['majuscule', 'ascender', 'xHeight', 'descender'] as LineFactorsKey[]).map(key => (
        <label
          key={key}
          className="bf-glyph-editor__label bf-glyph-editor__label--inline"
        >
          {key}
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className="bf-input bf-input--tiny"
            value={draftLineFactors[key]}
            onChange={e => {
              const num = Number(e.target.value);
              if (Number.isFinite(num)) {
                // clamp to [0, 1] here or let container clamp — your choice
                onDraftChange(key, Math.max(0, Math.min(1, num)));
              }
            }}
          />
        </label>
      ))}

      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onApply}
      >
        Apply grid
      </button>

      <button
        type="button"
        className="bf-button bf-button--ghost"
        onClick={onReset}
      >
        Reset grid
      </button>
    </div>
  );
};

export default SvgGlyphGridControls;

'use client';

// src/components/SvgGlyphEditor/SvgGlyphGridControls.tsx

import React from 'react';
import type { FontLineFactors } from '@mytypes/glyphEditor';

export type SvgGlyphGridControlsProps = {
  /**
   * Draft values currently shown in the inputs.
   * These are not applied to the canvas until "Apply grid" is pressed.
   */
  draftLineFactors: FontLineFactors;

  /**
   * Update a single draft field (capHeight, ascender, xHeight, descender).
   * The container is responsible for clamping / validation if needed.
   */
  onChangeDraft: (key: keyof FontLineFactors, value: number) => void;

  /**
   * Apply the draft values to the live grid used for rendering.
   */
  onApplyGrid: () => void;

  /**
   * Reset both draft + live values to defaults.
   */
  onResetGrid: () => void;
};

const SvgGlyphGridControls: React.FC<SvgGlyphGridControlsProps> = ({
  draftLineFactors,
  onChangeDraft,
  onApplyGrid,
  onResetGrid,
}) => {
  const handleChange =
    (key: keyof FontLineFactors) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value);
      if (!Number.isFinite(raw)) return;

      // clamp to [0, 1]; descender is interpreted as 0..1 below baseline
      const clamped = Math.max(0, Math.min(1, raw));
      onChangeDraft(key, clamped);
    };

  return (
    <div className="bf-glyph-editor__actions">
      <span className="bf-glyph-editor__label">
        Handwriting grid (0–1 relative factors)
      </span>

      <label className="bf-glyph-editor__label bf-glyph-editor__label--inline">
        Cap height
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          className="bf-input bf-input--tiny"
          value={draftLineFactors.capHeight}
          onChange={handleChange('capHeight')}
        />
      </label>

      <label className="bf-glyph-editor__label bf-glyph-editor__label--inline">
        Ascender
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          className="bf-input bf-input--tiny"
          value={draftLineFactors.ascender}
          onChange={handleChange('ascender')}
        />
      </label>

      <label className="bf-glyph-editor__label bf-glyph-editor__label--inline">
        x-height
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          className="bf-input bf-input--tiny"
          value={draftLineFactors.xHeight}
          onChange={handleChange('xHeight')}
        />
      </label>

      <label className="bf-glyph-editor__label bf-glyph-editor__label--inline">
        Descender
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          className="bf-input bf-input--tiny"
          value={draftLineFactors.descender}
          onChange={handleChange('descender')}
        />
      </label>

      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onApplyGrid}
      >
        Apply grid
      </button>

      <button
        type="button"
        className="bf-button bf-button--ghost"
        onClick={onResetGrid}
      >
        Reset grid
      </button>
    </div>
  );
};

export default SvgGlyphGridControls;

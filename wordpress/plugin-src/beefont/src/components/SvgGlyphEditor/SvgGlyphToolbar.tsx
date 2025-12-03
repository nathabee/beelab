'use client';

// src/components/SvgGlyphEditor/SvgGlyphToolbar.tsx

import React from 'react';
import type { DrawMode } from '@mytypes/glyphEditor';

export type SvgGlyphToolbarProps = {
  drawMode: DrawMode;
  onChangeDrawMode: (mode: DrawMode) => void;

  hasSelection: boolean;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasStrokes: boolean;

  onThinner: () => void;
  onThicker: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onInsertDefaultLetter: () => void;
};

const SvgGlyphToolbar: React.FC<SvgGlyphToolbarProps> = ({
  drawMode,
  onChangeDrawMode,
  hasSelection,
  canGroupSelection,
  canUngroupSelection,
  canUndo,
  canRedo,
  hasStrokes,
  onThinner,
  onThicker,
  onGroup,
  onUngroup,
  onUndo,
  onRedo,
  onDeleteSelected,
  onClearAll,
  onInsertDefaultLetter,
}) => {
  return (
    <div className="bf-glyph-editor__actions">
      {/* Tool choice */}
      <label className="bf-glyph-editor__label">
        Tool
        <select
          value={drawMode}
          onChange={e =>
            onChangeDrawMode(e.target.value as DrawMode)
          }
          className="bf-input bf-input--small"
        >
          <option value="stroke">Stroke (path-like)</option>
          <option value="circle">Circle (approx.)</option>
          <option value="select">Selection rectangle</option>
        </select>
      </label>

      {/* Stroke width controls */}
      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onThinner}
        disabled={!hasSelection}
      >
        Thinner
      </button>

      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onThicker}
        disabled={!hasSelection}
      >
        Thicker
      </button>

      {/* Grouping */}
      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onGroup}
        disabled={!canGroupSelection}
      >
        Group
      </button>

      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onUngroup}
        disabled={!canUngroupSelection}
      >
        Ungroup
      </button>

      {/* History */}
      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>

      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onRedo}
        disabled={!canRedo}
      >
        Redo
      </button>

      {/* Deletion / clearing */}
      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
      >
        Delete selected
      </button>

      <button
        type="button"
        className="bf-button bf-button--ghost"
        onClick={onClearAll}
        disabled={!hasStrokes}
      >
        Clear all
      </button>

      {/* Insert skeleton for current letter */}
      <button
        type="button"
        className="bf-button bf-button--secondary"
        onClick={onInsertDefaultLetter}
      >
        Default letter
      </button>
    </div>
  );
};

export default SvgGlyphToolbar;

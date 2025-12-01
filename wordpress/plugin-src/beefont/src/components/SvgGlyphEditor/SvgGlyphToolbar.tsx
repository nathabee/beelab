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

  onScaleWider: () => void;
  onScaleNarrower: () => void;
  onScaleTaller: () => void;
  onScaleShorter: () => void;
  onScaleBigger: () => void;
  onScaleSmaller: () => void;
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
  onScaleWider,
  onScaleNarrower,
  onScaleTaller,
  onScaleShorter,
  onScaleBigger,
  onScaleSmaller,
}) => {
  return (
    <div className="bf-glyph-editor__toolbar">
      {/* Row 1: Tool + default letter */}
      <div className="bf-glyph-editor__toolbar-row">
        <div className="bf-glyph-editor__toolbar-group">
          <span className="bf-glyph-editor__toolbar-group-label">
            Tool
          </span>
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

          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onInsertDefaultLetter}
          >
            Default letter
          </button>
        </div>
      </div>

      {/* Row 2: Stroke width + scale transforms */}
      <div className="bf-glyph-editor__toolbar-row">
        <div className="bf-glyph-editor__toolbar-group">
          <span className="bf-glyph-editor__toolbar-group-label">
            Stroke
          </span>
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
        </div>

        <div className="bf-glyph-editor__toolbar-group">
          <span className="bf-glyph-editor__toolbar-group-label">
            Transform
          </span>
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onScaleWider}
            disabled={!hasSelection}
          >
            Wider
          </button>
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onScaleNarrower}
            disabled={!hasSelection}
          >
            Narrower
          </button>
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onScaleTaller}
            disabled={!hasSelection}
          >
            Taller
          </button>
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onScaleShorter}
            disabled={!hasSelection}
          >
            Shorter
          </button>
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onScaleBigger}
            disabled={!hasSelection}
          >
            Bigger
          </button>
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={onScaleSmaller}
            disabled={!hasSelection}
          >
            Smaller
          </button>
        </div>
      </div>

      {/* Row 3: Grouping, history, delete/clear */}
      <div className="bf-glyph-editor__toolbar-row">
        <div className="bf-glyph-editor__toolbar-group">
          <span className="bf-glyph-editor__toolbar-group-label">
            Group
          </span>
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
        </div>

        <div className="bf-glyph-editor__toolbar-group">
          <span className="bf-glyph-editor__toolbar-group-label">
            History
          </span>
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
        </div>

        <div className="bf-glyph-editor__toolbar-group">
          <span className="bf-glyph-editor__toolbar-group-label">
            Cleanup
          </span>
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
        </div>
      </div>
    </div>
  );
};

export default SvgGlyphToolbar;

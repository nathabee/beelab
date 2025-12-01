'use client';

// src/components/SvgGlyphEditor/SvgGlyphUploadPanel.tsx

import React from 'react';

export type SvgGlyphUploadPanelProps = {
  isUploading: boolean;
  canUpload: boolean;
  onUpload: () => void;
};

const SvgGlyphUploadPanel: React.FC<SvgGlyphUploadPanelProps> = ({
  isUploading,
  canUpload,
  onUpload,
}) => {
  return (
    <div className="bf-glyph-editor__actions">
      <button
        type="button"
        className="bf-button bf-button--primary"
        onClick={onUpload}
        disabled={!canUpload || isUploading}
      >
        {isUploading ? 'Saving...' : 'Save glyph to backend'}
      </button>
    </div>
  );
};

export default SvgGlyphUploadPanel;

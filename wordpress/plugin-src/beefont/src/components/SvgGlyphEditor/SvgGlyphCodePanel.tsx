'use client';

// src/components/SvgGlyphEditor/SvgGlyphCodePanel.tsx

import React from 'react';

export type SvgGlyphCodePanelProps = {
  svgCode: string;
};

const SvgGlyphCodePanel: React.FC<SvgGlyphCodePanelProps> = ({
  svgCode,
}) => {
  return (
    <div className="bf-glyph-editor__svg-layout-code">
      <h3>SVG code</h3>
      <p className="bf-helptext">
        This is the SVG that corresponds to the current glyph. It contains
        only the real strokes (lines or curves), no guidelines and no
        reference letter.
      </p>
      <pre className="bf-glyph-editor__code">
        <code>{svgCode}</code>
      </pre>
    </div>
  );
};

export default SvgGlyphCodePanel;

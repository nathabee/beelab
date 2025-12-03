'use client';

// src/components/SvgGlyphEditor/SvgGlyphCodePanel.tsx

import React from 'react';

export type SvgGlyphCodePanelProps = {
  svgCode: string;
};

const SvgGlyphCodePanel: React.FC<SvgGlyphCodePanelProps> = ({
  svgCode,
}) => {
  // Escape < > to avoid HTML injection in the <code> block
  const escaped = svgCode
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return (
    <div className="bf-glyph-editor__svg-layout-code">
      <h3>SVG code</h3>

      <p className="bf-helptext">
        This SVG contains *only the actual strokes* of the glyph
        (lines and Bézier curves).  
        No guidelines, no reference text, no preview boxes are exported.
      </p>

      <pre className="bf-glyph-editor__code">
        <code dangerouslySetInnerHTML={{ __html: escaped }} />
      </pre>
    </div>
  );
};

export default SvgGlyphCodePanel;

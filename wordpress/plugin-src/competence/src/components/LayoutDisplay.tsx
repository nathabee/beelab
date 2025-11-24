'use client';

import React from 'react'; 
import { PDFLayout } from '@mytypes/pdf';

interface LayoutDisplayProps {
  layout?: PDFLayout | null;
}

const LayoutDisplay: React.FC<LayoutDisplayProps> = ({ layout }) => {
  if (!layout) return <p>No layout data available.</p>;

  return (
    <div>
      <h2>Selected Layout</h2>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {layout.header_icon_base64 && (
            <img
            src={layout.header_icon_base64}
            alt="Header Icon"
            width={50}
            height={50}
            style={{ marginRight: '10px' }}
            />

        )}
        <p>School Name: {layout.schule_name}</p>
      </div>
      <p>Header Message: {layout.header_message}</p>
      <p>Footer Message 1: {layout.footer_message1}</p>
      <p>Footer Message 2: {layout.footer_message2}</p>
    </div>
  );
};

export default LayoutDisplay;

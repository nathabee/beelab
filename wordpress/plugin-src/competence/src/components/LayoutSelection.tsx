'use client';

import React from 'react'; 
import { PDFLayout } from '@mytypes/pdf';
import { useApp } from '@context/AppContext';

interface LayoutSelectionProps {
  layouts: PDFLayout[];
}

const LayoutSelection: React.FC<LayoutSelectionProps> = ({ layouts }) => {
  const { activeLayout, setActiveLayout } = useApp();

  if (layouts.length === 0) return <p>No layouts available.</p>;

  const handleSelect = (layout: PDFLayout) => {
    setActiveLayout(layout);
  };

  return (
    <div className="mb-4">
      <h2>Select a Layout</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Icon</th>
            <th>School Name</th>
            <th>Header Message</th>
            <th>Footer 1</th>
            <th>Footer 2</th>
          </tr>
        </thead>
        <tbody>
          {layouts.map((layout) => (
            <tr
              key={layout.id}
              onClick={() => handleSelect(layout)}
              className={activeLayout?.id === layout.id ? 'selected-row' : ''}
              style={{ cursor: 'pointer' }}
            >
              <td>
                {layout.header_icon_base64 && (
                    <img
                    src={layout.header_icon_base64}
                    alt="Icon"
                    width={50}
                    height={50}
                    style={{ marginRight: '10px' }}
                    />

                )}
              </td>
              <td>{layout.schule_name}</td>
              <td>{layout.header_message}</td>
              <td>{layout.footer_message1}</td>
              <td>{layout.footer_message2}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LayoutSelection;

'use client';

import React, { useEffect, useRef } from 'react';
import { PDFLayout } from '@mytypes/pdf';
import { User } from '@bee/common/user';
import { Eleve } from '@mytypes/eleve';
import { Report } from '@mytypes/report';
import { formatDate } from '@utils/helper';

interface PrintHeaderProps {
  layout: PDFLayout;
  professor: User;
  eleve: Eleve;
  report: Report;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ layout, professor, eleve, report }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (canvas && context) {
      const image = new Image();
      image.src = layout.header_icon_base64;

      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);
      };

      image.onerror = (error) => {
        console.error('Failed to load header icon', error);
      };
    }
  }, [layout.header_icon_base64]);

  return (
    <div className="print-header-container">
      <div id="print-header-logo-container">
        <div id="print-header-logo">
          <canvas ref={canvasRef} id="headerCanvas"></canvas>
        </div>
        <div id="print-header-school">
          <div>{layout.schule_name}</div>
        </div>
      </div>

      <div className="print-header-gap"></div>

      <div className="print-header-info">
        <div className="print-header-professor">
          <div>Professor: {professor.last_name} {professor.first_name}</div>
        </div>

        <div className="print-header-eleve">
          <div>Student: {eleve.nom} {eleve.prenom}, {eleve.niveau_description}</div>
        </div>

        <div>
          <p>Report created: {formatDate(report.created_at)}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;

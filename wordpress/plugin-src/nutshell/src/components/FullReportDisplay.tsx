'use client';

import React, { useState } from 'react';
import { Report } from '@mytypes/report'; // Keep your French backend-aligned types
import { formatDate } from '@utils/helper'; // Utility to format ISO date string

interface FullReportDisplayProps {
  report: Report;
}

const FullReportDisplay: React.FC<FullReportDisplayProps> = ({ report }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <div className="report-card">
      <div className="card-header" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
        <h4>Report ID: {report.id}</h4>
        <p>Teacher ID: {report.professeur}</p>
        <p>Created At: {formatDate(report.created_at)}</p>
        <p>PDF Layout: {report.pdflayout}</p>
        <span>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="card-body">
          <h5>Included Test Types:</h5>
          <ul>
            {report.report_catalogues.map((catalogue) => (
              <li key={catalogue.id}>
                <strong>{catalogue.catalogue.description}</strong>
                <ul>
                  {catalogue.resultats.map((resultat) => (
                    <li key={resultat.id}>
                      Group: {resultat.groupage.desc_groupage} — Max Points: {Math.round(resultat.groupage.max_point)} 
                      (Thresholds: {Math.round(resultat.seuil1_percent)}% / {Math.round(resultat.seuil2_percent)}% / {Math.round(resultat.seuil3_percent)}%)
                      <ul>
                        {resultat.resultat_details.map((detail) => (
                          <li key={detail.id}>
                            Test: {detail.item.description}, Score: {Math.round(detail.score)} / {Math.round(detail.item.max_score)}, 
                            Label: {detail.scorelabel}, Notes: {detail.observation}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FullReportDisplay;

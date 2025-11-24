'use client';

import React, { useState } from 'react';
import { ShortReport, ShortReportCatalogue } from '@mytypes/shortreport';

interface ShortReportDisplayProps {
  reports: ShortReport[];
}

interface ShortReportCatalogueDisplayProps {
  reportCatalogue: ShortReportCatalogue;
  isNegativeSeuil: boolean;
}

const ShortReportDisplay: React.FC<ShortReportDisplayProps> = ({ reports }) => {
  const hasNegativeSeuil = (report: ShortReport): boolean => {
    return report.report_catalogues.some(catalogue =>
      catalogue.resultats.some(
        result =>
          result.seuil1_percent < 0 ||
          result.seuil2_percent < 0 ||
          result.seuil3_percent < 0
      )
    );
  };

  return (
    <div className="tab-content mt-3">
      {reports.length > 0 ? (
        reports.map((report) => {
          const isNegativeSeuil = hasNegativeSeuil(report);

          return (
            <div key={report.id} className="report-card mb-3">
              <h5 style={{ color: isNegativeSeuil ? 'var(--custom-alert)' : 'inherit' }}>
                Report ID: {report.id} | Student: {report.eleve.prenom} {report.eleve.nom} ({report.eleve.niveau})
              </h5>
              <p>
                {report.professeur ? (
                  <span>
                    Teacher: {report.professeur.first_name} {report.professeur.last_name}
                  </span>
                ) : (
                  <span>No assigned teacher</span>
                )}
                <br />
                Created: {new Date(report.created_at).toLocaleString()} | Updated: {new Date(report.updated_at).toLocaleString()}
              </p>

              <div className="report-catalogues">
                <div>
                  {report.report_catalogues.length > 0 ? (
                    report.report_catalogues.map((catalogue) => (
                      <ReportCatalogueDisplay
                        key={catalogue.id}
                        reportCatalogue={catalogue}
                        isNegativeSeuil={isNegativeSeuil}
                      />
                    ))
                  ) : (
                    <p>No catalogues found for this report.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>No reports available.</p>
      )}
    </div>
  );
};

const ReportCatalogueDisplay: React.FC<ShortReportCatalogueDisplayProps> = ({
  reportCatalogue,
  isNegativeSeuil,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="catalogue-item mb-2">
      <h6
        onClick={() => setIsExpanded(!isExpanded)}
        className={`catalogue-title ${isExpanded ? 'expanded' : ''}`}
        style={{ color: isNegativeSeuil ? 'var(--custom-alert)' : 'inherit' }}
      >
        Test: {reportCatalogue.catalogue} {isExpanded ? '▲' : '▼'}
      </h6>

      {isExpanded && (
        <div className="catalogue-results" style={{ color: isNegativeSeuil ? 'var(--custom-alert)' : 'inherit' }}>
          {reportCatalogue.resultats.length > 0 ? (
            <ul>
              {reportCatalogue.resultats.map((result) => (
                <li key={result.id}>
                  {result.groupage.label_groupage} | Score: {Math.round(result.score)} / Max: {result.groupage.max_point} | 
                  Thresholds: {Math.round(result.seuil1_percent)}%, {Math.round(result.seuil2_percent)}%, {Math.round(result.seuil3_percent)}%
                </li>
              ))}
            </ul>
          ) : (
            <p>No data available for this catalogue.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShortReportDisplay;

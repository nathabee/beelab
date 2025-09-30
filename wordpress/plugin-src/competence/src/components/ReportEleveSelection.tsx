'use client';

import React, { useState } from 'react';
import { useApp } from '@context/AppContext';
import { Eleve } from '@mytypes/eleve';
import { Report } from '@mytypes/report';
import FullReportDisplay from '@components/FullReportDisplay';
import { useEleveReports } from '@hooks/useEleveReports';

interface ReportEleveSelectionProps {
  eleve: Eleve;
}

const ReportEleveSelection: React.FC<ReportEleveSelectionProps> = ({ eleve }) => {
  const [expanded, setExpanded] = useState(false);
  const { catalogue, setActiveReport, setActiveCatalogues, layouts, setActiveLayout } = useApp();
  const { reports, loading, error } = useEleveReports(eleve);

  const handleSelectReport = (report: Report) => {
    setExpanded(false);

    const catalogueIds = report.report_catalogues.map(rc => rc.catalogue.id);
    const selectedCatalogues = catalogue.filter(cat => catalogueIds.includes(cat.id));
    setActiveCatalogues(selectedCatalogues);

    if (selectedCatalogues.length !== report.report_catalogues.length) {
      console.error(`Catalogue mismatch: expected ${report.report_catalogues.length}, found ${selectedCatalogues.length}`);
    }

    const selectedLayout = layouts.find(l => l.id === report.pdflayout);
    if (selectedLayout) {
      setActiveLayout(selectedLayout);
    } else {
      console.error(`No layout found with ID ${report.pdflayout}`);
    }

    setActiveReport(report);
  };

  const toggleExpand = () => setExpanded(!expanded);

  if (loading) return <p>Loading student reports...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <button onClick={toggleExpand}>
        {expanded ? 'Hide reports' : 'Show reports'}
      </button>

      {expanded && (
        <div>
          {reports.length > 0 ? (
            reports.map(report => (
              <div key={report.id} className="shadow-container">
                <button className="button-warning" onClick={() => handleSelectReport(report)}>
                  Select this Report
                </button>
                <FullReportDisplay report={report} />
              </div>
            ))
          ) : (
            <p>No reports found for this student.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportEleveSelection;

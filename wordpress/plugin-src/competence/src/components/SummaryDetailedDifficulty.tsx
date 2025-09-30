'use client';

import React, { useState } from 'react';
import { Report, ReportCatalogue, Resultat } from '@mytypes/report';
import { Eleve } from '@mytypes/eleve';
import { User } from '@mytypes/user';
import { PDFLayout } from '@mytypes/pdf';
import { useApp } from '@context/AppContext';
import PrintHeader from './PrintHeader';
import '@styles/pdf.css';

interface SummaryDetailedDifficultyProps {
  eleve: Eleve;
  professor: User;
  pdflayout: PDFLayout;
  report: Report;
  max_item: number;
  self_page: boolean;
}

interface MainRow {
  type: 'main';
  reportCatalogue: ReportCatalogue;
  resultat: Resultat;
}

interface DetailRow {
  type: 'detail';
  detail: {
    score: number;
    item: {
      description: string;
      max_score: number;
    };
    observation: string;
  };
}

type Row = MainRow | DetailRow;

const SummaryDetailedDifficulty: React.FC<SummaryDetailedDifficultyProps> = ({
  eleve,
  professor,
  pdflayout,
  report,
  max_item,
  self_page,
}) => {
  const { activeReport } = useApp();
  const cachedReport = activeReport ? activeReport.report_catalogues : report.report_catalogues;

  const flattenedResults: Row[] = cachedReport.flatMap((reportCatalogue: ReportCatalogue) =>
    reportCatalogue.resultats
      .filter((resultat: Resultat) => resultat.seuil2_percent < 100 || resultat.seuil1_percent < 100)
      .flatMap((resultat: Resultat) => {
        const mainRow: MainRow = { type: 'main', reportCatalogue, resultat };
        const detailRows: DetailRow[] =
          resultat.seuil2_percent < 100 && resultat.resultat_details
            ? resultat.resultat_details.map((detail) => ({ type: 'detail', detail }))
            : [];
        return [mainRow, ...detailRows];
      })
  );

  const paginatedResults: Row[][] = [];
  for (let i = 0; i < flattenedResults.length; i += max_item) {
    paginatedResults.push(flattenedResults.slice(i, i + max_item));
  }

  const [currentPage, setCurrentPage] = useState(0);
  const goToPreviousPage = () => currentPage > 0 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < paginatedResults.length - 1 && setCurrentPage(currentPage + 1);

  const renderTable = (rows: Row[]) => (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th></th>
          <th>Type</th>
          <th>Score</th>
          <th>Max Score</th>
          <th>%</th>
          <th>Seuil 1</th>
          <th>Seuil 2</th>
          <th>Seuil 3</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          if (row.type === 'main') {
            const { reportCatalogue, resultat } = row;
            const isBold = resultat.seuil1_percent < 100;
            const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;
            const base64Image = localStorage.getItem(imageKey) || null;

            return (
              <tr key={rowIndex} style={isBold ? { fontWeight: 'bold' } : {}}>
                <td>
                  {base64Image && (
                    <img
                      src={base64Image}
                      alt="Groupage Icon"
                      width={20}
                      height={20}
                      style={{ marginRight: '10px' }}
                    />
                  )}
                  {reportCatalogue.catalogue.description}
                </td>
                <td>{resultat.groupage.label_groupage}</td>
                <td>{resultat.score.toFixed(0)}</td>
                <td>{resultat.groupage.max_point.toFixed(0)}</td>
                <td>{Math.round((resultat.score / resultat.groupage.max_point) * 100)}%</td>
                <td>{Math.round(resultat.seuil1_percent)}%</td>
                <td>{Math.round(resultat.seuil2_percent)}%</td>
                <td>{Math.round(resultat.seuil3_percent)}%</td>
              </tr>
            );
          }

          if (row.type === 'detail') {
            const { detail } = row;
            const testInError = detail.score * 2 < detail.item.max_score;
            return testInError ? (
              <tr key={`detail-${rowIndex}`}>
                <td colSpan={2} style={{ paddingLeft: '30px' }}>{detail.item.description}</td>
                <td>{Math.round(detail.score)}</td>
                <td>{detail.item.max_score}</td>
                <td>{detail.observation}</td>
                <td colSpan={3}></td>
              </tr>
            ) : null;
          }

          return null;
        })}
      </tbody>
    </table>
  );

  return (
    <div>
      {self_page ? (
        <>
          <div id={`printable-summary-${currentPage}`} className="print-container">
            <PrintHeader layout={pdflayout} professor={professor} eleve={eleve} report={report} />
            <h2>Detailed Report Problems</h2>
            {renderTable(paginatedResults[currentPage])}
          </div>

          <div className="pagination-controls">
            <button onClick={goToPreviousPage} disabled={currentPage === 0}>Previous</button>
            <span>Page {currentPage + 1} of {paginatedResults.length}</span>
            <button onClick={goToNextPage} disabled={currentPage === paginatedResults.length - 1}>Next</button>
          </div>
        </>
      ) : (
        <div>
          {paginatedResults.map((rows, pageIndex) => (
            <div key={pageIndex} className="print-container">
              <PrintHeader layout={pdflayout} professor={professor} eleve={eleve} report={report} />
              <h2>Detailed Report Problems</h2>
              {renderTable(rows)}
              <div className="spacing" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SummaryDetailedDifficulty;

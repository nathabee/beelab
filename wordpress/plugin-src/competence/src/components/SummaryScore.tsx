'use client';

import React, { useEffect, useState } from 'react';
import { ReportCatalogue, Resultat } from '@mytypes/report';

interface SummaryScoreProps {
  report_catalogues: ReportCatalogue[];
}

const SummaryScore: React.FC<SummaryScoreProps> = ({ report_catalogues }) => {
  const [base64Images, setBase64Images] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const images: { [key: string]: string } = {};

    report_catalogues.forEach((catalogue) => {
      catalogue.resultats.forEach((resultat) => {
        const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;
        const base64Image = localStorage.getItem(imageKey);
        if (base64Image) {
          images[imageKey] = base64Image;
        }
      });
    });

    setBase64Images(images);
  }, [report_catalogues]);

  return (
    <div className="print-footer-scoreoverview">
      {report_catalogues.map((catalogue) => (
        <div key={catalogue.id}>
          <h3>{catalogue.catalogue.description}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Test Type</th>
                <th>Score</th>
                <th>Max Score</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {catalogue.resultats.length > 0 ? (
                catalogue.resultats.map((resultat: Resultat, resIndex: number) => {
                  const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;
                  const base64Image = base64Images[imageKey] || null;

                  return (
                    <tr key={`${catalogue.id}-${resIndex}`}>
                      <td>
                        {base64Image && (
                          <img
                            src={base64Image}
                            alt="Icon"
                            height={12}
                            style={{ marginRight: '10px' }}
                          />
                        )}
                        {resultat.groupage.label_groupage}
                      </td>
                      <td>{resultat.score.toFixed(0)}</td>
                      <td>{resultat.groupage.max_point.toFixed(0)}</td>
                      <td>{Math.round((resultat.score / resultat.groupage.max_point) * 100)}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default SummaryScore;

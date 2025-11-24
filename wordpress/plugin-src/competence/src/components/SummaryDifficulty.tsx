'use client';

import React, { useEffect, useState } from 'react';
import { ReportCatalogue, Resultat } from '@mytypes/report';
import logo from '@assets/logo.png'; // Assuming logo is available locally and handled correctly by bundler

interface SummaryDifficultyProps {
  report_catalogues: ReportCatalogue[];
}

const SummaryDifficulty: React.FC<SummaryDifficultyProps> = ({ report_catalogues }) => {
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
    <div>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Catalogue</th>
            <th>Groupage</th>
            <th>Score</th>
            <th>Max Score</th>
            <th>%</th>
            <th>Seuil 1</th>
            <th>Seuil 2</th>
            <th>Seuil 3</th>
            <th>Icon</th>
          </tr>
        </thead>
        <tbody>
          {report_catalogues.length > 0 ? (
            report_catalogues.map((reportCatalogue, reportCatalogueIndex) =>
              reportCatalogue.resultats
                .filter(res => res.seuil2_percent < 100 || res.seuil1_percent < 100)
                .map((resultat, resIndex) => {
                  const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;
                  const base64Image = base64Images[imageKey] || null;
                  const isBold = resultat.seuil1_percent < 100;

                  return (
                    <tr
                      key={`${reportCatalogueIndex}-${resIndex}`}
                      style={isBold ? { fontWeight: 'bold' } : {}}
                    >
                      <td>{reportCatalogue.catalogue.description}</td>
                      <td>{resultat.groupage.label_groupage}</td>
                      <td>{resultat.score.toFixed(2)}</td>
                      <td>{resultat.groupage.max_point.toFixed(2)}</td>
                      <td>{Math.round((resultat.score / resultat.groupage.max_point) * 100)}%</td>
                      <td>{Math.round(resultat.seuil1_percent)}%</td>
                      <td>{Math.round(resultat.seuil2_percent)}%</td>
                      <td>{Math.round(resultat.seuil3_percent)}%</td>
                      <td>
                        <img
                          src={base64Image || logo}
                          alt="Groupage Icon"
                          width={50}
                          height={50}
                          style={{ marginRight: '10px' }}
                        />
                      </td>
                    </tr>
                  );
                })
            )
          ) : (
            <tr>
              <td colSpan={9}>No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SummaryDifficulty;

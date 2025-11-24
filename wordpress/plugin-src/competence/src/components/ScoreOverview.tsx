'use client';

import React, { useEffect, useState } from 'react';
import { ReportCatalogue, Resultat } from '@mytypes/report';

interface ScoreOverviewProps {
    reportCatalogue: ReportCatalogue;
}

const ScoreOverview: React.FC<ScoreOverviewProps> = ({ reportCatalogue }) => {
    const [base64Images, setBase64Images] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const images: { [key: string]: string } = {};

        reportCatalogue.resultats.forEach((resultat) => {
            const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;
            const base64Image = localStorage.getItem(imageKey);
            if (base64Image) {
                images[imageKey] = base64Image;
            }
        });

        setBase64Images(images);
    }, [reportCatalogue]);

    return (
        <div className="print-footer-scoreoverview">
            <h3>{reportCatalogue.catalogue.description}</h3>
            <table className="table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Score</th>
                        <th>Max</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    {reportCatalogue.resultats.length > 0 ? (
                        reportCatalogue.resultats.map((resultat: Resultat, resIndex: number) => {
                            const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;
                            const base64Image = base64Images[imageKey] || null;

                            return (
                                <tr key={`${reportCatalogue.id}-${resIndex}`}>
                                    <td>
                                        {base64Image && (
                                            <img
                                                src={base64Image}
                                                alt="Groupage Icon"
                                                height={10}
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
                            <td colSpan={4}>No data</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ScoreOverview;

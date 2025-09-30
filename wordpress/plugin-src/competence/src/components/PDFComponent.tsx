'use client';

import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import RadarChart from '@components/RadarChart';
import RadarChartImage from '@components/RadarChartImage';
import PrintHeader from '@components/PrintHeader';
import ScoreOverview from '@components/ScoreOverview';
import SummaryDetailedDifficulty from '@components/SummaryDetailedDifficulty';

import { getImageData } from '@utils/helper';

import     '@styles/pdf.css';

import { Report } from '@mytypes/report';
import { Eleve } from '@mytypes/eleve';
import { User } from '@mytypes/user';
import { PDFLayout } from '@mytypes/pdf';

interface PDFComponentProps {
  report: Report;
  eleve: Eleve;
  professor: User;
  pdflayout: PDFLayout;
  isImageChart?: boolean;
}

const PDFComponent: React.FC<PDFComponentProps> = ({
  report,
  eleve,
  professor,
  pdflayout,
  isImageChart = false,
}) => {
  const reportCatalogues = report.report_catalogues;

  const handlePrintPDF = async () => {
    const printButton = document.querySelector('.btn') as HTMLElement;
    if (printButton) printButton.style.display = 'none';

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Charts
    for (let i = 0; i < reportCatalogues.length; i++) {
      const chartSection = document.getElementById(`printable-chart-${i}`);
      if (chartSection) {
        const canvas = await html2canvas(chartSection, { scale: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 0.5);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

        if (i < reportCatalogues.length - 1) {
          doc.addPage();
        }
      }
    }

    // Summary Pages
    const summaryPages = Array.from(document.querySelectorAll('[id^="printable-summary-"]'));
    for (let i = 0; i < summaryPages.length; i++) {
      const section = summaryPages[i] as HTMLElement;
      if (section) {
        doc.addPage();
        const canvas = await html2canvas(section, { scale: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 0.5);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }
    }

    if (printButton) printButton.style.display = 'inline-block';

    const todayFormat = new Date().toISOString().slice(0, 19).replace(/T/, '_').replace(/:/g, '-');
    doc.save(`report_${eleve.nom}__${eleve.prenom}_${todayFormat}.pdf`);
  };

  const processedData = reportCatalogues.map((reportCatalogue) => {
    const labels = reportCatalogue.resultats.map((res) => res.groupage.label_groupage);
    const labelImages = reportCatalogue.resultats.map((res) => {
      const imageKey = `competence_icon_${res.groupage.groupage_icon_id}`;
      return getImageData(imageKey);
    });
    const data = reportCatalogue.resultats.map(
      (res) => (res.seuil1_percent + res.seuil2_percent + res.seuil3_percent) / 100
    );

    return {
      description: reportCatalogue.catalogue.description,
      labels,
      labelImages,
      data,
    };
  });

  return (
    <div>
      <button onClick={handlePrintPDF} className="button-warning">Print PDF</button>

      {processedData.map((chartData, index) => (
        <div key={index} id={`printable-chart-${index}`} className="print-container">
          <PrintHeader layout={pdflayout} professor={professor} eleve={eleve} report={report} />
          <div className="print-banner"><div></div></div>
          <h3>{chartData.description}</h3>
          {isImageChart ? (
            <RadarChartImage
              chartData={{
                labels: chartData.labels,
                data: chartData.data,
                labelImages: chartData.labelImages,
              }}
            />
          ) : (
            <RadarChart chartData={{ labels: chartData.labels, data: chartData.data }} />
          )}
          <ScoreOverview reportCatalogue={reportCatalogues[index]} />
          <div className="print-footer">
            <div className="print-footer-message1">{pdflayout.footer_message1}</div>
            <div className="print-footer-message2">{pdflayout.footer_message2}</div>
          </div>
        </div>
      ))}

      <div className="spacing" />

      <SummaryDetailedDifficulty
        eleve={eleve}
        professor={professor}
        pdflayout={pdflayout}
        report={report}
        max_item={40}
        self_page={false}
      />
    </div>
  );
};

export default PDFComponent;

'use client';
// src/context/AppContext.tsx

// shared component
// use client is needed by nextjs (useeeffect...) but will be ignored by wordpress


import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';


import { Catalogue, Report, ScoreRulePoint, ReportCatalogue, Resultat } from '@mytypes/report';
import { PDFLayout } from '@mytypes/pdf';
import { Eleve, Niveau } from '@mytypes/eleve';
import { fetchBase64Image } from '@utils/helper';


import { useUser } from '@bee/common';







interface AppContextType {


  reset: () => void;

  activeCatalogues: Catalogue[];
  setActiveCatalogues: (catalogues: Catalogue[]) => void;

  activeEleve: Eleve | null;
  setActiveEleve: (eleve: Eleve | null) => void;

  activeReport: Report | null;
  setActiveReport: (report: Report | null) => void;

  activeLayout: PDFLayout | null;
  setActiveLayout: (layout: PDFLayout | null) => void;

  catalogue: Catalogue[];
  setCatalogue: (catalogue: Catalogue[]) => void;

  eleves: Eleve[];
  setEleves: React.Dispatch<React.SetStateAction<Eleve[]>>;

  layouts: PDFLayout[];
  setLayouts: (layouts: PDFLayout[]) => void;

  scoreRulePoints: ScoreRulePoint[] | null;
  setScoreRulePoints: (points: ScoreRulePoint[]) => void;

  niveaux: Niveau[] | null;
  setNiveaux: (niveaux: Niveau[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { token } = useUser();
  const [activeCatalogues, internalSetActiveCatalogues] = useState<Catalogue[]>([]);
  const [activeEleve, internalSetActiveEleve] = useState<Eleve | null>(null);
  const [catalogue, internalSetCatalogue] = useState<Catalogue[]>([]);
  const [eleves, internalSetEleves] = useState<Eleve[]>([]);
  const [scoreRulePoints, internalSetScoreRulePoints] = useState<ScoreRulePoint[] | null>(null);
  const [activeReport, internalSetActiveReport] = useState<Report | null>(null);
  const [activeLayout, internalSetActiveLayout] = useState<PDFLayout | null>(null);
  const [layouts, internalSetLayouts] = useState<PDFLayout[]>([]);
  const [niveaux, internalSetNiveaux] = useState<Niveau[] | null>(null);


  // boot app state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    internalSetNiveaux(JSON.parse(localStorage.getItem('niveaux') || '[]'));
    internalSetActiveCatalogues(JSON.parse(localStorage.getItem('activeCatalogues') || '[]'));
    internalSetActiveEleve(JSON.parse(localStorage.getItem('activeEleve') || 'null'));
    internalSetActiveReport(JSON.parse(localStorage.getItem('activeReport') || 'null'));
    internalSetActiveLayout(JSON.parse(localStorage.getItem('activeLayout') || 'null'));
    internalSetLayouts(JSON.parse(localStorage.getItem('layouts') || '[]'));
    internalSetCatalogue(JSON.parse(localStorage.getItem('catalogue') || '[]'));
    internalSetScoreRulePoints(JSON.parse(localStorage.getItem('scoreRulePoints') || '[]'));
  }, []);
  // fetch needed images when report changes (auth comes from shared)
  useEffect(() => {
    if (!token || !activeReport) return;

    const fetchImages = async () => {
      try {
        await Promise.all(
          activeReport.report_catalogues.map(async (reportCatalogue: ReportCatalogue) => {
            await Promise.all(
              reportCatalogue.resultats.map(async (resultat: Resultat) => {
                const id = resultat.groupage.groupage_icon_id;
                if (id) {
                  const imageKey = `competence_icon_${id}`;
                  await fetchBase64Image(imageKey, id, token);
                }
              })
            );
          })
        );
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    fetchImages();
  }, [token, activeReport]);

  // === setters with persistence ===
  const setCatalogue = useCallback((newCatalogue: Catalogue[]) => {
    internalSetCatalogue(newCatalogue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalogue', JSON.stringify(newCatalogue));
    }
  }, []);

  const setEleves = useCallback<React.Dispatch<React.SetStateAction<Eleve[]>>>(update => {
    internalSetEleves(prev => {
      const next = typeof update === 'function' ? (update as any)(prev) : update;
      if (typeof window !== 'undefined') localStorage.setItem('eleves', JSON.stringify(next));
      return next;
    });
  }, []);

  const setActiveLayout = useCallback((layout: PDFLayout | null) => {
    internalSetActiveLayout(layout);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeLayout', JSON.stringify(layout));
    }
  }, []);

  const setScoreRulePoints = useCallback((points: ScoreRulePoint[]) => {
    internalSetScoreRulePoints(points);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scoreRulePoints', JSON.stringify(points));
    }
  }, []);

  const setActiveReport = useCallback((report: Report | null) => {
    if (report) {
      const updatedReport = {
        ...report,
        report_catalogues: report.report_catalogues.map(c => ({ ...c, resultats: c.resultats })),
      };
      internalSetActiveReport(updatedReport);
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeReport', JSON.stringify(updatedReport));
      }
    } else {
      internalSetActiveReport(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeReport');
      }
    }
  }, []);

  const setNiveaux = useCallback((newNiveaux: Niveau[]) => {
    internalSetNiveaux(newNiveaux);
    if (typeof window !== 'undefined') {
      localStorage.setItem('niveaux', JSON.stringify(newNiveaux));
    }
  }, []);

  const setLayouts = useCallback((ls: PDFLayout[]) => {
    internalSetLayouts(ls);
    if (typeof window !== 'undefined') {
      localStorage.setItem('layouts', JSON.stringify(ls));
    }
  }, []);

  const setActiveCatalogues = useCallback((catalogues: Catalogue[]) => {
    internalSetActiveCatalogues(catalogues);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeCatalogues', JSON.stringify(catalogues));
    }
  }, []);

  const setActiveEleve = useCallback((eleve: Eleve | null) => {
    internalSetActiveEleve(eleve);
    setActiveReport(null); // reset report when changing student
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeEleve', JSON.stringify(eleve));
      localStorage.removeItem('activeReport');
    }
  }, [setActiveReport]);

  // app-only reset (does not touch auth)
  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;
    [
      'activeCatalogues',
      'activeReport',
      'activeEleve',
      'activeLayout',
      'eleves',
      'catalogue',
      'niveaux',
      'layouts',
      'scoreRulePoints',
    ].forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).forEach(k => k.startsWith('competence_') && localStorage.removeItem(k));

    internalSetActiveCatalogues([]);
    internalSetActiveEleve(null);
    internalSetActiveReport(null);
    internalSetActiveLayout(null);
    internalSetCatalogue([]);
    internalSetEleves([]);
    internalSetLayouts([]);
    internalSetScoreRulePoints(null);
    internalSetNiveaux(null);
  }, []);

  const value = useMemo(() => ({
    activeCatalogues, activeEleve, catalogue, eleves,
    scoreRulePoints, activeReport, activeLayout, layouts, niveaux,
    reset,
    setActiveCatalogues, setActiveEleve, setScoreRulePoints,
    setActiveReport, setActiveLayout, setCatalogue, setEleves, setLayouts, setNiveaux,
  }), [
    activeCatalogues, activeEleve, catalogue, eleves,
    scoreRulePoints, activeReport, activeLayout, layouts, niveaux,
    reset, setActiveCatalogues, setActiveEleve, setScoreRulePoints,
    setActiveReport, setActiveLayout, setCatalogue, setEleves, setLayouts, setNiveaux,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
'use client';
// src/context/AuthContext.tsx

// shared component
// use client is needed by nextjs (useeeffect...) but will be ignored by wordpress


import React, { createContext, useContext, useState, useEffect ,useCallback,useMemo} from 'react';


import { Catalogue, Report, ScoreRulePoint, ReportCatalogue, Resultat } from '@mytypes/report';
import { PDFLayout } from '@mytypes/pdf';
import { Eleve, Niveau } from '@mytypes/eleve';
import { User } from '@mytypes/user';
import { fetchBase64Image } from '@utils/helper';

import { getToken, isTokenExpired } from '@utils/jwt';










interface AuthContextType {

  token: string | null;
  setToken: (token: string | null) => void;

  user: User | null;
  userRoles: string[];
  isAuthenticated: boolean;

  login: (token: string, userInfo: User) => void;
  logout: () => void;




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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 
  const [token, internalSetToken] = useState<string | null>(null);
  const [user, internalSetUser] = useState<User | null>(null);
  const [userRoles, internalSetUserRoles] = useState<string[]>([]);
  const [isAuthenticated, internalSetisAuthenticated] = useState(false);
  const [activeCatalogues, internalSetActiveCatalogues] = useState<Catalogue[]>([]);
  const [activeEleve, internalSetActiveEleve] = useState<Eleve | null>(null);
  const [catalogue, internalSetCatalogue] = useState<Catalogue[]>([]);
  const [eleves, internalSetEleves] = useState<Eleve[]>([]);
  const [scoreRulePoints, internalSetScoreRulePoints] = useState<ScoreRulePoint[] | null>(null);
  const [activeReport, internalSetActiveReport] = useState<Report | null>(null);
  const [activeLayout, internalSetActiveLayout] = useState<PDFLayout | null>(null);
  const [layouts, internalSetLayouts] = useState<PDFLayout[]>([]);
  const [niveaux, internalSetNiveaux] = useState<Niveau[] | null>(null);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      internalSetToken(savedToken);
      internalSetisAuthenticated(true);
      internalSetUserRoles(JSON.parse(localStorage.getItem('userRoles') || '[]'));
      internalSetUser(JSON.parse(localStorage.getItem('userInfo') || 'null'));
      internalSetNiveaux(JSON.parse(localStorage.getItem('niveaux') || '[]'));
      internalSetActiveCatalogues(JSON.parse(localStorage.getItem('activeCatalogues') || '[]'));
      internalSetActiveEleve(JSON.parse(localStorage.getItem('activeEleve') || 'null'));
      internalSetActiveReport(JSON.parse(localStorage.getItem('activeReport') || 'null'));
      internalSetActiveLayout(JSON.parse(localStorage.getItem('activeLayout') || 'null'));
      internalSetLayouts(JSON.parse(localStorage.getItem('layouts') || '[]'));
      internalSetCatalogue(JSON.parse(localStorage.getItem('catalogue') || '[]'));
    } else {
      logout(); // <-- relies on stable callback below
    }
  }, []); // eslint-disable-line

  // retrieve image whenever new report is active
  useEffect(() => {
    const token = getToken();
    if (token && activeReport) {
      //console.log("authentify ok going to fetch data" );
      const fetchImages = async () => {
        try {
          await Promise.all(
            activeReport.report_catalogues.map(async (reportCatalogue: ReportCatalogue) => {
              await Promise.all(
                reportCatalogue.resultats.map(async (resultat: Resultat) => {
                  if (resultat.groupage.groupage_icon_id) {
                    //const imageKey = competence_icon_${resultat.groupage.groupage_icon_id};
                    const imageKey = `competence_icon_${resultat.groupage.groupage_icon_id}`;

                    //console.log("call fetchBase64Image with imageKey",imageKey) 
                    await fetchBase64Image(imageKey, resultat.groupage.groupage_icon_id, token);
                  }
                })
              );
            })
          );
        } catch (error) {
          console.error("Error fetching images:", error);
        }
      };

      fetchImages();
    } else if (!token || isTokenExpired(token)) {
      console.error("Token is either missing or expired.");
      // Handle the token expiration logic here
    }
  }, [activeReport]); // Run effect when activeReport changes

  // check every 10s if token expired
  useEffect(() => {
    const check = () => {
      const newToken = getToken();
      setToken(newToken); // this will reset token to null if expired
      if (!newToken) {
        internalSetisAuthenticated(false);
      }
    };

    check();
    const interval = setInterval(check, 10000); // check every 10s

    return () => clearInterval(interval);
  }, []);

  const login = useCallback((token: string, userInfo: User) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', token);
    internalSetToken(token);
    internalSetUser(userInfo);
    internalSetUserRoles(userInfo.roles);
    internalSetisAuthenticated(true);
    localStorage.setItem('userRoles', JSON.stringify(userInfo.roles));
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }, []);

  const logout = useCallback(() => {
    if (typeof window === 'undefined') return;
    // remove only what you own; don't nuke everything
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRoles');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('activeCatalogues');
    localStorage.removeItem('activeReport');
    localStorage.removeItem('activeEleve');
    localStorage.removeItem('activeLayout');
    localStorage.removeItem('eleves');
    localStorage.removeItem('catalogue');
    localStorage.removeItem('niveaux');
    localStorage.removeItem('layouts');
    localStorage.removeItem('scoreRulePoints');
    Object.keys(localStorage).forEach((k) => k.startsWith('competence_') && localStorage.removeItem(k));

    internalSetToken(null);
    internalSetisAuthenticated(false);
    internalSetUser(null);
    internalSetUserRoles([]);
    internalSetActiveCatalogues([]);
    internalSetActiveEleve(null);
    internalSetActiveReport(null);
    internalSetActiveLayout(null);
    internalSetCatalogue([]);
    internalSetEleves([]);
    internalSetLayouts([]);
    internalSetScoreRulePoints([]);
  }, []);

  const setToken = useCallback((newToken: string | null) => {
    internalSetToken(newToken);
    if (typeof window === 'undefined') return;
    if (newToken) localStorage.setItem('authToken', newToken);
    else localStorage.removeItem('authToken');
  }, []);

  const setCatalogue = useCallback((newCatalogue: Catalogue[]) => {
    internalSetCatalogue(newCatalogue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalogue', JSON.stringify(newCatalogue));
    }
  }, []);

  const setEleves = useCallback<React.Dispatch<React.SetStateAction<Eleve[]>>>(update => {
    internalSetEleves(prev => {
      const next = typeof update === 'function' ? (update as any)(prev) : update;
      if (typeof window !== 'undefined') {
        localStorage.setItem('eleves', JSON.stringify(next));
      }
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

  const setLayouts = useCallback((layouts: PDFLayout[]) => {
    internalSetLayouts(layouts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('layouts', JSON.stringify(layouts));
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
    setActiveReport(null); // resets the report
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeEleve', JSON.stringify(eleve));
      localStorage.removeItem('activeReport');
    }
  }, [setActiveReport]);

  // ---- memoize the exported value ----
  const value = useMemo(() => ({
    token, user, userRoles, isAuthenticated,
    activeCatalogues, activeEleve, catalogue, eleves,
    scoreRulePoints, activeReport, activeLayout, layouts, niveaux,

    // stable public API
    setToken, login, logout,
    setActiveCatalogues, setActiveEleve, setScoreRulePoints,
    setActiveReport, setActiveLayout, setCatalogue, setEleves, setLayouts, setNiveaux,
  }), [
    token, user, userRoles, isAuthenticated,
    activeCatalogues, activeEleve, catalogue, eleves,
    scoreRulePoints, activeReport, activeLayout, layouts, niveaux,
    // functions are stable (callbacks), not needed in deps
  ]);

  return (
    <AuthContext.Provider value={value}>   {/* <-- use the memoized value */}
      {children}
    </AuthContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useApp must be used within an AuthProvider');
  }
  return context;
};
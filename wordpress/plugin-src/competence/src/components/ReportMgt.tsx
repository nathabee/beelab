'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Spinner from 'react-bootstrap/Spinner';
 
import { useApp } from '@context/AppContext';
import { useUser } from '@bee/common';
import { useReport } from '@hooks/useReport';
import ActiveContextCard from '@components/ActiveContextCard';
import ReportEleveSelection from '@components/ReportEleveSelection';
import { ReportCatalogue, Resultat, ResultatDetail, ScoreRulePoint } from '@mytypes/report';
import { ReportCataloguePatch, ResultatPatch } from '@mytypes/reportpatch';

import { useProtectedPage } from '@bee/common'; 
 


const ReportMgt: React.FC = () => {
  const navigate = useNavigate();


  const { 
    user,  
    token
  } = useUser();

  const {
    activeEleve,
    activeReport,
    activeCatalogues,
    activeLayout, 
    scoreRulePoints,
    setActiveReport, 
    reset
  } = useApp();

  const [reportData, setReportData] = useState<ReportCatalogue[]>([]);
  const [isModified, setIsModified] = useState<boolean[]>([]);
  // const [token, setToken] = useState<string | null>(null);

  const defaultScoreRulePoint = useMemo<ScoreRulePoint>(() => ({
    id: 1,
    scorerule: 1,
    scorelabel: "?",
    score: -1,
    description: "Default score rule",
  }), []);


  useProtectedPage(() => reset()); // handles token check + redirect
 

  // This useEffect handles reportData INIT every time activeReport changes
  useEffect(() => {
    console.log("activeReport changed:", activeReport);
    if (activeReport?.report_catalogues) {
      setReportData(activeReport.report_catalogues);
      setIsModified(new Array(activeReport.report_catalogues.length).fill(false));
    }
  }, [activeReport]);


  const { createReport, updateReport, loading, isError } = useReport(token);

  // Input handling
  const handleObservationChange = (i: number, j: number, k: number, value: string) => {
    setReportData(prev => {
      const copy = [...prev];
      copy[i].resultats[j].resultat_details[k].observation = value;
      return copy;
    });
    markModified(j);
  };

  const handleScoreLabelChange = (
    i: number,
    j: number,
    k: number,
    label: string,
    rule: number
  ) => {
    const rulePoint = scoreRulePoints?.find(
      srp => srp.scorerule === rule && srp.scorelabel === label
    ) || defaultScoreRulePoint;

    setReportData(prev => {
      const updated = [...prev];
      const detail = updated[i].resultats[j].resultat_details[k];
      detail.scorelabel = label;
      detail.score = rule === 8 ? parseInt(label, 10) : rulePoint.score;
      if (detail.score > detail.item.max_score) {
        detail.score = detail.item.max_score;
      }
      return updated;
    });
    markModified(j);
  };

  const markModified = (index: number) => {
    setIsModified(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  const handleSaveResultat = async (catIndex: number, resIndex: number) => {
    if (!activeReport || !token) return;

    const patch: ReportCataloguePatch = {
      id: reportData[catIndex].id,
      resultats: [
        {
          id: reportData[catIndex].resultats[resIndex].id,
          resultat_details: reportData[catIndex].resultats[resIndex].resultat_details.map(detail => ({
            id: detail.id,
            item_id: detail.item.id,
            score: detail.score,
            scorelabel: detail.scorelabel,
            observation: detail.observation
          }))
        }
      ]
    };

    const updated = await updateReport(
      activeReport.id,
      activeEleve!.id,
      user!.id,
      activeLayout!.id,
      [patch]
    );

    if (updated) {
      setActiveReport(updated);
      // markModified(resIndex); // reset or not depending on logic
    }
  };

  const handleSubmit = async () => {
    if (!activeReport || !token) return;

    const patchData: ReportCataloguePatch[] = reportData.map(cat => ({
      id: cat.id,
      resultats: cat.resultats.map(res => ({
        id: res.id,
        resultat_details: res.resultat_details.map(detail => ({
          id: detail.id,
          item_id: detail.item.id,
          score: detail.score,
          scorelabel: detail.scorelabel,
          observation: detail.observation
        }))
      }))
    }));

    const updated = await updateReport(
      activeReport.id,
      activeEleve!.id,
      user!.id,
      activeLayout!.id,
      patchData
    );

    if (updated) {
      setActiveReport(updated);
      setIsModified(new Array(reportData.length).fill(false));
    }
  };

  const handleCreateReport = async () => {
    if (!activeEleve || !activeCatalogues?.length || !activeLayout || !user || !token) return;

    const ids = activeCatalogues.map(c => c.id);
    const created = await createReport(activeEleve.id, user.id, activeLayout.id, ids);

    if (created) {
      setActiveReport(created);
    }
  };

  if (loading) return <Spinner animation="border" />;
  if (isError) return <p>Unable to load or update report. Try again.</p>;

  return (
    <div className="container mt-3 ml-2">
      <ActiveContextCard />

      {(!activeEleve || !activeCatalogues?.length || !activeLayout || !user  ) ? (
        <p className="text-warning mt-3">⚠️ Veuillez d'abord sélectionner un élève, un catalogue, une mise en page et être connecté.</p>
      ) : (
        <>
          <div className="container mt-3 ml-2">
            {activeEleve && activeLayout && activeCatalogues && (
              <button onClick={handleCreateReport}>Create New Report</button>
            )}
            {activeReport && (
              <button onClick={handleSubmit}>Save Report</button>
            )}

            {activeEleve && (
              <>
                <h2>Student Reports</h2>
                <ReportEleveSelection eleve={activeEleve} />
              </>
            )}

            {reportData.length > 0 && (
              reportData.map((cat, catIdx) => (
                <div key={cat.id}>
                  <h3>Catalogue: {cat.catalogue.description}</h3>
                  {cat.resultats.map((res, resIdx) => (
                    <div key={res.id}>
                      <h4>{res.groupage.desc_groupage}</h4>
                      {res.resultat_details.map((detail, detIdx) => (
                        <div key={detail.id}>
                          <label>{detail.item.description}</label>
                          <input
                            type="text"
                            value={detail.observation}
                            onChange={e => handleObservationChange(catIdx, resIdx, detIdx, e.target.value)}
                          />
                          <input
                            type="number"
                            value={detail.score}
                            onChange={e => handleScoreLabelChange(
                              catIdx,
                              resIdx,
                              detIdx,
                              detail.scorelabel, // you may ignore score if scorelabel covers this
                              detail.item.scorerule
                            )}
                          />

                          <select
                            value={detail.scorelabel || defaultScoreRulePoint.scorelabel}
                            onChange={(e) => handleScoreLabelChange(catIdx, resIdx, detIdx, e.target.value, detail.item.scorerule)}
                          >
                            {detail.item.scorerule === 8
                              ? Array.from({ length: detail.item.max_score + 1 }, (_, i) => (
                                <option key={i} value={i}>{i}</option>
                              ))
                              : scoreRulePoints
                                ?.filter((srp) =>
                                  srp.scorerule === detail.item.scorerule || srp.scorerule === defaultScoreRulePoint.scorerule
                                )
                                .map((srp) => (
                                  <option key={srp.id} value={srp.scorelabel}>{srp.scorelabel}</option>
                                ))
                            }
                          </select>

                        </div>
                      ))}
                      <button
                        className={isModified[resIdx] ? 'btn btn-warning' : 'btn btn-secondary'}
                        onClick={() => handleSaveResultat(catIdx, resIdx)}
                      >
                        Save Resultat
                      </button>

                    </div>
                  ))}
                </div>
              ))
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default ReportMgt;

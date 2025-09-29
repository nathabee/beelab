// src/hooks/useReport.ts
 

import { useState } from 'react'; 
import { ReportCataloguePatch } from '@mytypes/reportpatch';
import { Report } from '@mytypes/report';
// import { getApiUrl } from '@utils/helper';
import { apiApp, authHeaders } from '@utils/api';

export const useReport = (token: string | null) => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  //const apiUrl = getApiUrl();

  const createReport = async (
    eleveId: number,
    userId: number,
    pdflayoutId: number,
    catalogueIds: number[]
  ): Promise<Report | null> => {
    if (!token) return null;

    setLoading(true);
    setIsError(false);

    try {
      const response = await apiApp.post(`/fullreports/`, {
        eleve: eleveId,
        professeur: userId,
        pdflayout: pdflayoutId,
        catalogue_ids: catalogueIds,
      }, { headers: authHeaders(token) });

      return response.data;
    } catch (error) {
      setIsError(true);
      console.error('Error creating report:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateReport = async (
    reportId: number,
    eleveId: number,
    userId: number,
    pdflayoutId: number,
    patchData: ReportCataloguePatch[]
  ): Promise<Report | null> => {
    if (!token) return null;

    setLoading(true);
    setIsError(false);

    try {
      const response = await apiApp.patch(`/fullreports/${reportId}/`, {
        id: reportId,
        eleve: eleveId,
        professeur: userId,
        pdflayout: pdflayoutId,
        report_catalogues_data: patchData,
      },  { headers: authHeaders(token) });

      return response.data;
    } catch (error) {
      setIsError(true);
      console.error('Error updating report:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createReport, updateReport, loading, isError };
};

// src/hooks/useEleveReports.ts
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Report } from '@mytypes/report';
import { Eleve } from '@mytypes/eleve';
// import { getToken } from '@utils/jwt';
//import { getApiUrl } from '@utils/helper';
import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common';

export const useEleveReports = (eleve: Eleve) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token } = useUser();

  useEffect(() => {
    const fetchReports = async () => {
      try { 
        const res = await apiApp.get(`/eleve/${eleve.id}/reports/`,  { headers: authHeaders(token) });
        setReports(res.data);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [eleve]);

  return { reports, loading, error };
};

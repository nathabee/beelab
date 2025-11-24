'use client';
import { useState, useCallback } from 'react';
import { ShortReport } from '@mytypes/shortreport';
import { apiApp, authHeaders } from '@utils/api';
import { useUser } from '@bee/common'; 
import { useApp } from '@context/AppContext';

interface UseShortReportsResult {
  reports: ShortReport[];
  loading: boolean;
  error: boolean;
  fetchReports: () => void;
}

const useShortReports = (): UseShortReportsResult => {
  const [reports, setReports] = useState<ShortReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { logout, token } = useUser();
  const { reset } = useApp();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(false);
 
    if (!token  ) {
      setError(true);
      setLoading(false);
      logout();  
      reset();
      return;           // <-- stop here
    }

    try {
      const res = await apiApp.get(`/shortreports/`, { headers: authHeaders(token) });
      setReports(res.data);
    } catch (e) {
      console.error('Error fetching short reports:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [logout]); // <-- logout is stable; depending on it is fine

  return { reports, loading, error, fetchReports };
};

export default useShortReports;

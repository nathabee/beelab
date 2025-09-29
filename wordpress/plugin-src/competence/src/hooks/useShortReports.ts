'use client';
import { useState, useCallback } from 'react';
import { ShortReport } from '@mytypes/shortreport';
import { getToken, isTokenExpired } from '@utils/jwt';
import { apiApp, authHeaders } from '@utils/api';
import { useApp } from '@context/AuthContext';

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
  const { logout } = useApp();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(false);

    const token = getToken();
    if (!token || isTokenExpired(token)) {
      setError(true);
      setLoading(false);
      logout();         // side-effect, but stable now
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

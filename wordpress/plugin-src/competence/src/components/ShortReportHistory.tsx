import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';
import ShortReportDisplay from './ShortReportDisplay';
import useShortReports from '@hooks/useShortReports';

const ShortReportHistory: React.FC = () => {
  const navigate = useNavigate();
  const { reports, loading, error, fetchReports } = useShortReports();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="loading-indicator">
        <p>Loading short reports...</p>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Could not load reports. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="container mt-3">
      <h1>Report History</h1>
      <button onClick={fetchReports} className="btn btn-primary mb-3">
        Refresh
      </button>
      <ShortReportDisplay reports={reports} />
    </div>
  );
};

export default ShortReportHistory;

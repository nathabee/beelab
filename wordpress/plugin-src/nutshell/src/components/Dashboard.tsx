'use client';

import React from 'react';
import ActiveContextCard from '@components/ActiveContextCard'; 
import ShortReportHistory from '@components/ShortReportHistory'; 
 
import { useProtectedPage } from '@bee/common'; 
import { useApp } from '@context/AppContext';

const Dashboard: React.FC = () => {
  const {  reset } = useApp();
  useProtectedPage(() => reset()); // handles token check + redirect
 

  return (
    <>
    <h1>DASHBOARD</h1>
    <ActiveContextCard/>
    <ShortReportHistory />
    </>
  );
};

export default Dashboard;
  
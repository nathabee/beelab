'use client';

import React from 'react';
import ActiveContextCard from '@components/ActiveContextCard'; 
import ShortReportHistory from '@components/ShortReportHistory'; 
import { useApp } from '@context/AuthContext';
import { useProtectedPage } from '@hooks/useProtectedPage';

const Dashboard: React.FC = () => {
  useProtectedPage(); // handles token check + redirect
 

  return (
    <>
    <h1>DASHBOARD</h1>
    <h2>##############################</h2>
    <ActiveContextCard/>
    <h2>##############################</h2>
    <ShortReportHistory />
    </>
  );
};

export default Dashboard;
  
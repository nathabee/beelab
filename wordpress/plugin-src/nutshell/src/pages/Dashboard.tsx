'use client';

import React from 'react';
import ActiveContextCard from '@components/ActiveContextCard';
import DashboardCard from '@components/DashboardCard';

import { useProtectedPage } from '@bee/common';
import { useApp } from '@context/AppContext';

const Dashboard: React.FC = () => {
  const { reset } = useApp();

  // prüft Token, macht Redirect, ruft reset nur im Fehlerfall
  useProtectedPage(() => reset());

  return (
    <>
      <h1>DASHBOARD</h1>
      <ActiveContextCard />
      <DashboardCard />
    </>
  );
};

export default Dashboard;

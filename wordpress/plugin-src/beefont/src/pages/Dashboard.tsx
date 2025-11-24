// src/pages/Dashboard.tsx
'use client';

import React from 'react';
import ActiveContextCard from '@components/ActiveContextCard';
import DashboardCard from '@components/DashboardCard';

import { useProtectedPage } from '@bee/common';
import { useApp } from '@context/AppContext';
import FontBuildsPanel from '@components/FontBuildsPanel';

const Dashboard: React.FC = () => {
  const { reset } = useApp();

  useProtectedPage(() => reset());

  return (
    <>
      <h1>DASHBOARD</h1>
      <ActiveContextCard />
      <DashboardCard />
      {/* Optional: hier nur anzeigen, wenn du wirklich ständig Builds im Dashboard sehen willst */}
      <FontBuildsPanel />
    </>
  );
};

export default Dashboard;

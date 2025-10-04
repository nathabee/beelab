// src/components/Dashboard.tsx
'use client';

import React from "react";
import { useProtectedPage } from "@bee/common";
import ActiveContextCard from "@components/ActiveContextCard"; 

const Dashboard: React.FC = () => {
  console.log('[Dashboard] component called');
  useProtectedPage(() => reset());// redirects if not logged

  return (
    <>
      <h1>📊 Dashboard</h1>  
      <ActiveContextCard />
    </>
  );
};

export default Dashboard;

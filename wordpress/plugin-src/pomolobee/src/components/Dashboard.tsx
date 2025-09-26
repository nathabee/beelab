// src/components/Dashboard.tsx
'use client';

import React from "react";
import { useProtectedPage } from "@hooks/useProtectedPage";
import ActiveContextCard from "@components/ActiveContextCard";
import ErrorTestButtons  from "@components/ErrorTestButtons";

const Dashboard: React.FC = () => {
  console.log('[Dashboard] component called');
  useProtectedPage(); // redirects if not logged

  return (
    <>
      <h1>📊 Dashboard</h1> 
      <ErrorTestButtons />
      <ActiveContextCard />
    </>
  );
};

export default Dashboard;

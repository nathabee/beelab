// src/components/Farm.tsx
'use client';

import React from "react";
import { useProtectedPage } from "@bee/common";
import FieldSelection from "@components/FieldSelection";
import ActiveContextCard from "@components/ActiveContextCard";
import FieldCard from "@components/FieldCard";

 
import { useApp } from '@context/AppContext';


const Farm: React.FC = () => {
  console.log('[Farm] component called');
    useProtectedPage(() => reset());// redirects if not logged



  const {  activeField } = useApp();



  return (
    <>
      <h1>Farm</h1>
      <FieldSelection />
      <ActiveContextCard />
      <FieldCard field={activeField} />
    </>
  );
};

export default Farm;

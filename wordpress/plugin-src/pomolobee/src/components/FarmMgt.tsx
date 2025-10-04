// src/components/FarmMgt.tsx
'use client';

import React from "react";
import { useProtectedPage } from "@bee/common";
import FieldSelection from "@components/FieldSelection";
import ActiveContextCard from "@components/ActiveContextCard";
import FieldEditCard from "@components/FieldEditCard";
 
import { useApp } from '@context/AppContext';



const FarmMgt: React.FC = () => {
  console.log('[FarmMgt] component called');
    useProtectedPage(() => reset());// redirects if not logged



  const {  activeField } = useApp();



  return (
    <>
      <h1>Farm Management</h1>
      <FieldSelection />
      <ActiveContextCard />
      <FieldEditCard field={activeField} />
    </>
  );
};

export default FarmMgt;

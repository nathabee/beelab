// src/pages/CompetenceErrorMgt.tsx
import React from 'react';
import { ErrorTestButtons, ErrorPage, ErrorHistoryPage } from '@bee/common';
import { apiApp, apiUser } from '@utils/api';

const CompetenceErrorMgt = () => (
  <>
    <h2>Debug phase: test some errors</h2>
    <ErrorTestButtons apiApp={apiApp} apiUser={apiUser} plugin="competence" />


    <h3>Active error display</h3>
    <ErrorPage plugin="competence" />

    <h3>History of all errors</h3>
    <ErrorHistoryPage plugin="competence" />
  </>
);

export default CompetenceErrorMgt;

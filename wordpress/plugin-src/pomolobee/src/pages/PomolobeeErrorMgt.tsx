// src/pages/PomolobeeErrorMgt.tsx
import React from 'react';
import { ErrorTestButtons, ErrorPage, ErrorHistoryPage } from '@bee/common';
import { apiApp, apiUser } from '@utils/api';

const PomolobeeErrorMgt = () => (
  <>
    <h2>Debug phase: test some errors</h2>
    <ErrorTestButtons apiApp={apiApp} apiUser={apiUser} plugin="pomolobee" />


    <h3>Active error display</h3>
    <ErrorPage plugin="pomolobee" />

    <h3>History of all errors</h3>
    <ErrorHistoryPage plugin="pomolobee" />
  </>
);

export default PomolobeeErrorMgt;

// src/pages/ErrorMgt.tsx
import React from 'react';
import {  ErrorPage, ErrorHistoryPage } from '@bee/common'; 

const ErrorMgt = () => (
  <> 


    <h3>Active error display</h3>
    <ErrorPage plugin="beegame" />

    <h3>History of all errors</h3>
    <ErrorHistoryPage plugin="beegame" />
  </>
);

export default ErrorMgt;

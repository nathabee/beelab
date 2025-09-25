// src/app/router.tsx
 

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompetenceHome from '@pages/CompetenceHome';
import CompetenceLogin from '@pages/CompetenceLogin';
import CompetenceDashboard from '@pages/CompetenceDashboard';
import CompetenceError from '@pages/CompetenceError';
import CompetenceStudentMgt from  '@pages/CompetenceStudentMgt';
import CompetencePdfConf from  '@pages/CompetencePdfConf'; 
import CompetenceCatalogueMgt from  '@pages/CompetenceCatalogueMgt';
import CompetenceReportMgt from  '@pages/CompetenceReportMgt';
import CompetenceOverviewTest from  '@pages/CompetenceOverviewTest';
import CompetencePdfView from  '@pages/CompetencePdfView';

const AppRoutes = () => (
  <Routes>
    
    <Route path="/home" element={<CompetenceHome />} />
    <Route path="/login" element={<CompetenceLogin />} />
    <Route path="/dashboard" element={<CompetenceDashboard />} />
    <Route path="/student_mgt" element={<CompetenceStudentMgt />} />
    <Route path="/pdf_conf" element={<CompetencePdfConf />} />
    <Route path="/catalogue_mgt" element={<CompetenceCatalogueMgt />} />
    <Route path="/report_mgt" element={<CompetenceReportMgt />} />
    <Route path="/overview_test" element={<CompetenceOverviewTest />} /> 
    <Route path="/pdf_view" element={<CompetencePdfView />} />
    <Route path="/error" element={<CompetenceError />} />

    <Route path="/"  element={<CompetenceDashboard />} />
  </Routes>
);

export default AppRoutes;
 
  
// src/app/router.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import CompetenceHome from '@pages/CompetenceHome';
import CompetenceDashboard from '@pages/CompetenceDashboard';
import CompetenceStudentMgt from '@pages/CompetenceStudentMgt';
import CompetencePdfConf from '@pages/CompetencePdfConf';
import CompetenceCatalogueMgt from '@pages/CompetenceCatalogueMgt';
import CompetenceReportMgt from '@pages/CompetenceReportMgt';
import CompetenceErrorMgt from '@pages/CompetenceErrorMgt';
import CompetenceOverviewTest from '@pages/CompetenceOverviewTest';
import CompetencePdfView from '@pages/CompetencePdfView';

import CompetenceUserMgt from '@pages/CompetenceUserMgt';

import { ErrorPage } from '@bee/common/error';
import { UserLogin } from '@bee/common';
import useBootstrapData from '@hooks/useBootstrapData';
import { apiUser } from '@utils/api';

const AppRoutes = () => (
  <Routes>
    <Route path="/home" element={<CompetenceHome />} />
    <Route
      path="/login"
      element={
        <UserLogin
          plugin="competence"
          initialDemoRoles={['teacher']}           
          usePluginBootstrap={useBootstrapData}    
          usePluginApis={() => ({ apiUser })}  
        />
      }
    />
    <Route path="/user_mgt" element={<CompetenceUserMgt />} />
    <Route path="/dashboard" element={<CompetenceDashboard />} />
    <Route path="/student_mgt" element={<CompetenceStudentMgt />} />
    <Route path="/pdf_conf" element={<CompetencePdfConf />} />
    <Route path="/catalogue_mgt" element={<CompetenceCatalogueMgt />} />
    <Route path="/report_mgt" element={<CompetenceReportMgt />} />
    <Route path="/overview_test" element={<CompetenceOverviewTest />} />
    <Route path="/pdf_view" element={<CompetencePdfView />} />
    <Route path="/error" element={<ErrorPage plugin="competence" />} />
    <Route path="/error_mgt" element={<CompetenceErrorMgt />} />
    <Route path="/" element={<CompetenceHome />} />
  </Routes>
);

export default AppRoutes;

// src/app/router.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from '@pages/Home';
import Dashboard from '@pages/Dashboard';
import JobOverviewPage from '@pages/JobOverviewPage';
import JobDetailPage from '@pages/JobDetailPage';
// import TemplateAlphabetPage from '@pages/TemplateAlphabetPage';
import PrintUploadPage from '@pages/PrintUploadPage';
import PageAnalysisRetryPage from '@pages/PageAnalysisRetryPage';
import GlyphBrowserPage from '@pages/GlyphBrowserPage';
import MissingCharactersPage from '@pages/MissingCharactersPage';
import FontBuildPage from '@pages/FontBuildPage';
import ErrorMgtPage from '@pages/ErrorMgtPage';

import { ErrorPage } from '@bee/common/error';
import { UserLogin } from '@bee/common';
import useBootstrapData from '@hooks/useBootstrapData';
import { apiUser } from '@utils/api';

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Login */}
    <Route
      path="/login"
      element={
        <UserLogin
          plugin="beefont"
          initialDemoRoles={['beefont']}
          usePluginBootstrap={useBootstrapData}
          usePluginApis={() => ({ apiUser })}
        />
      }
    />
 
 

    {/* Core pages */}
    <Route path="/home" element={<Home />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/joboverview" element={<JobOverviewPage />} />
    <Route path="/jobdetail" element={<JobDetailPage />} />
     {/* <Route path="/templatealphabet" element={<TemplateAlphabetPage />} /> */}
    <Route path="/printupload" element={<PrintUploadPage />} />
    <Route path="/pageanalysisretry" element={<PageAnalysisRetryPage />} />
    <Route path="/glyphbrowser" element={<GlyphBrowserPage />} />
    <Route path="/missingcharacters" element={<MissingCharactersPage />} />
    <Route path="/fontBuild" element={<FontBuildPage />} />
    {/* Error route */} 
    <Route path="/error" element={<ErrorPage plugin="beefont" />} />
    <Route path="/error_mgt" element={<ErrorMgtPage />} />


    <Route path="/user_mgt" element={<div>User Management – template placeholder</div>} /> 
    {/* Root → redirect to /home */}
    <Route path="/" element={<Home />} />
  </Routes>
);

export default AppRoutes;

// src/app/router.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from '@pages/Home';
import Dashboard from '@pages/Dashboard';

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
          plugin="nutshell"
          initialDemoRoles={['nutshell']}
          usePluginBootstrap={useBootstrapData}
          usePluginApis={() => ({ apiUser })}
        />
      }
    />

    {/* Core pages */}
    <Route path="/home" element={<Home />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/user_mgt" element={<div>User Management – template placeholder</div>} />
    <Route path="/error_mgt" element={<div>Error Management – template placeholder</div>} />

    {/* Error route */}
    <Route path="/error" element={<ErrorPage plugin="nutshell" />} />

    {/* Root → redirect to /home */}
    <Route path="/" element={<Home />} />
  </Routes>
);

export default AppRoutes;

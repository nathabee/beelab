// src/app/router.tsx
 

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PomoloBeeHome from '@pages/PomoloBeeHome';
import PomoloBeeLogin from '@pages/PomoloBeeLogin';
import PomoloBeeDashboard from '@pages/PomoloBeeDashboard';
import PomoloBeeError from '@pages/PomoloBeeError';

import PomoloBeeFarm from '@pages/PomoloBeeFarm';

const AppRoutes = () => (
  <Routes>
    
    <Route path="/pomolobee_home" element={<PomoloBeeHome />} /> 
    <Route path="/pomolobee_login" element={<PomoloBeeLogin />} />
    <Route path="/pomolobee_error" element={<PomoloBeeError />} /> 
    <Route path="/pomolobee_dashboard" element={<PomoloBeeDashboard />} />
    <Route path="/pomolobee_farm" element={<PomoloBeeFarm />} />
    <Route path="/"  element={<PomoloBeeHome />} />
  </Routes>
);

export default AppRoutes;
 
  
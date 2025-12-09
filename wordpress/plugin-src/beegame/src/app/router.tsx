// src/app/router.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Home from '@pages/Home';
import LifeSim from '@pages/LifeSim';
import ForestFire from '@pages/ForestFire';
import EpidemicSpread from '@pages/EpidemicSpread';
import Diffusion from '@pages/Diffusion';
import ElementaryAutomata from '@pages/ElementaryAutomata';
import LogisticMap from '@pages/LogisticMap';
import ErrorMgt from '@pages/ErrorMgt';

import { ErrorPage } from '@bee/common/error';  

const AppRoutes: React.FC = () => (
  <Routes> 

    {/* Core pages */}
    <Route path="/home" element={<Home />} />
    <Route path="/lifesim" element={<LifeSim />} /> 
    <Route path="/forestfire" element={<ForestFire />} /> 
    <Route path="/epidemic" element={<EpidemicSpread />} /> 
    <Route path="/diffusion" element={<Diffusion />} /> 
    <Route path="/elementary" element={<ElementaryAutomata />} /> 
    <Route path="/logisticmap" element={<LogisticMap />} /> 
    <Route path="/error_mgt" element={<ErrorMgt/>} />

    {/* Error route */}
    <Route path="/error" element={<ErrorPage plugin="beegame" />} />

    {/* Root → redirect to /home */}
    <Route path="/" element={<Home />} />
  </Routes>
);

export default AppRoutes;

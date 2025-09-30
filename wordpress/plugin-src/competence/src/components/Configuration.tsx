'use client';

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutDisplay from '@components/LayoutDisplay';
import LayoutSelection from '@components/LayoutSelection';
import { useApp } from '@context/AppContext';
 
import { useProtectedPage } from '@hooks/useProtectedPage';

const Configuration: React.FC = () => {
  const navigate = useNavigate();
  const { activeLayout, layouts } = useApp();

  useProtectedPage(); // handles token check + redirect

  return (
    <div className="container mt-3 ml-2">
      <h1>Configuration</h1>

      <div className="tab-content mt-3">
        {activeLayout ? (
          <LayoutDisplay layout={activeLayout} />
        ) : (
          <p>No layout selected</p>
        )}

        {layouts.length === 0 ? (
          <p>No layout found</p>
        ) : (
          <LayoutSelection layouts={layouts} />
        )}
      </div>
    </div>
  );
};

export default Configuration;

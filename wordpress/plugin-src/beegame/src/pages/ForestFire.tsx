// src/pages/ForestFire.tsx
'use client';

import React, { useEffect } from 'react';
import ForestFireCard from '@components/ForestFireCard';
import ForestFireControl from '@components/ForestFireControl';
import { ForestFireProvider } from '@context/ForestFireContext';
import { useApp } from '@context/AppContext';

const ForestFireInner: React.FC = () => (
  <div className="bee-beegame-forestfire">
    <h1 className="h4 mb-3">Forest Fire Automaton</h1>
    <div className="row g-3">
      <div className="col-md-8">
        <ForestFireCard />
      </div>
      <div className="col-md-4">
        <ForestFireControl />
      </div>
    </div>
  </div>
);

const ForestFirePage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('forestFire');
  }, [setActiveGame]);

  return (
    <ForestFireProvider>
      <ForestFireInner />
    </ForestFireProvider>
  );
};

export default ForestFirePage;

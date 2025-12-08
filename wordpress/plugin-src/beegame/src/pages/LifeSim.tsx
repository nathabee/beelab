// src/pages/LifeSim.tsx
'use client';

import React, { useEffect } from 'react';
import LifeSimCard from '@components/LifeSimCard';
import LifeSimControl from '@components/LifeSimControl';
import { LifeSimProvider } from '@context/LifeSimContext';
import { useApp } from '@context/AppContext';

const LifeSimInner: React.FC = () => (
  <div className="bee-beegame-lifesim">
    <h1 className="h4 mb-3">Game of Life</h1>
    <div className="row g-3">
      <div className="col-md-8">
        <LifeSimCard />
      </div>
      <div className="col-md-4">
        <LifeSimControl />
      </div>
    </div>
  </div>
);

const LifeSimPage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('lifeSim');
  }, [setActiveGame]);

  return (
    <LifeSimProvider>
      <LifeSimInner />
    </LifeSimProvider>
  );
};

export default LifeSimPage;

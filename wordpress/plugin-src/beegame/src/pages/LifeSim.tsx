// src/pages/LifeSim.tsx
'use client';

import React, { useEffect } from 'react';
import LifeSimCard from '@components/LifeSimCard';
import LifeSimControl from '@components/LifeSimControl';
import { LifeSimProvider } from '@context/LifeSimContext';
import SimulationLayout from '@components/layout/SimulationLayout';

import { useApp } from '@context/AppContext';



const LifeSimPage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('lifeSim');
  }, [setActiveGame]);

  return (
    <LifeSimProvider>
      <SimulationLayout
        title="Game of Life"
        left={<LifeSimCard />}
        right={<LifeSimControl />}
      />
    </LifeSimProvider>
  );
};

export default LifeSimPage;


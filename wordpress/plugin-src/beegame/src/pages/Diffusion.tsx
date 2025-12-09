// src/pages/Diffusion.tsx
'use client';

import React, { useEffect } from 'react';
import { DiffusionProvider } from '@context/DiffusionContext';
import DiffusionCard from '@components/DiffusionCard';
import DiffusionControl from '@components/DiffusionControl';
import SimulationLayout from '@components/layout/SimulationLayout';
import { useApp } from '@context/AppContext';

const DiffusionPage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('diffusion');
  }, [setActiveGame]);

  return (
    <DiffusionProvider>
      <SimulationLayout
        title="Diffusion"
        left={<DiffusionCard />}
        right={<DiffusionControl />}
      />
    </DiffusionProvider>
  );
};

export default DiffusionPage;

// src/pages/EpidemicSpread.tsx
'use client';

import React, { useEffect } from 'react';
import { EpidemicSpreadProvider } from '@context/EpidemicSpreadContext';
import EpidemicSpreadCard from '@components/EpidemicSpreadCard';
import EpidemicSpreadControl from '@components/EpidemicSpreadControl';
import SimulationLayout from '@components/layout/SimulationLayout';
import { useApp } from '@context/AppContext';

const EpidemicSpreadPage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('epidemic');
  }, [setActiveGame]);

  return (
    <EpidemicSpreadProvider>
      <SimulationLayout
        title="Epidemic Spread (SIR)"
        left={<EpidemicSpreadCard />}
        right={<EpidemicSpreadControl />}
      />
    </EpidemicSpreadProvider>
  );
};

export default EpidemicSpreadPage;

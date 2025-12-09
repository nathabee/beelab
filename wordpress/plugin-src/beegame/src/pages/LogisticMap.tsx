'use client';

import React, { useEffect } from 'react';
import { useApp } from '@context/AppContext';
import SimulationLayout from '@components/layout/SimulationLayout';

import { LogisticMapProvider } from '@context/LogisticMapContext';
import LogisticMapCard from '@components/LogisticMapCard';
import LogisticMapControl from '@components/LogisticMapControl';

const LogisticMapPage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('logisticMap');
  }, [setActiveGame]);

  return (
    <LogisticMapProvider>
      <SimulationLayout
        title="Logistic Map (Growth & Chaos)"
        left={<LogisticMapCard />}
        right={<LogisticMapControl />}
      />
    </LogisticMapProvider>
  );
};

export default LogisticMapPage;

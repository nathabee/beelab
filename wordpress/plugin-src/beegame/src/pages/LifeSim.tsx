// src/pages/LifeSim.tsx
'use client';

import React, { useEffect } from 'react';
import LifeSimCard from '@components/LifeSimCard';
import LifeSimStatsCard from '@components/LifeSimStatsCard';
import LifeSimHelpCard from '@components/LifeSimHelpCard';
import LifeSimTheorieCard from '@components/LifeSimTheorieCard';
import LifeSimControl from '@components/LifeSimControl';
import { LifeSimProvider } from '@context/LifeSimContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import SimulationRightTabs from '@components/layout/SimulationRightTabs';

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
        right={
          <SimulationRightTabs
            tabs={[
              {
                id: 'controls',
                label: 'Controls',
                content: <LifeSimControl />,
              },
              {
                id: 'stats',
                label: 'Statistics',
                content: <LifeSimStatsCard />,
              },
              {
                id: 'help',
                label: 'Help',
                content: <LifeSimHelpCard />,
              },
              {
                id: 'theorie',
                label: 'Theory',
                content: <LifeSimTheorieCard />,
              },
            ]}
            initialActiveId="controls"
          />
        }
      />
    </LifeSimProvider>
  );
};

export default LifeSimPage;

// src/pages/Diffusion.tsx
'use client';

import React, { useEffect } from 'react';
import DiffusionCard from '@components/DiffusionCard';
import DiffusionStatsCard from '@components/DiffusionStatsCard';
import DiffusionHelpCard from '@components/DiffusionHelpCard';
import DiffusionTheorieCard from '@components/DiffusionTheorieCard';
import DiffusionControl from '@components/DiffusionControl';
import { DiffusionProvider } from '@context/DiffusionContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import SimulationRightTabs from '@components/layout/SimulationRightTabs';

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
        right={
          <SimulationRightTabs
            tabs={[
              {
                id: 'controls',
                label: 'Controls',
                content: <DiffusionControl />,
              },
              {
                id: 'stats',
                label: 'Statistics',
                content: <DiffusionStatsCard />,
              },
              {
                id: 'help',
                label: 'Help',
                content: <DiffusionHelpCard />,
              },
              {
                id: 'theorie',
                label: 'Theory',
                content: <DiffusionTheorieCard />,
              },
            ]}
            initialActiveId="controls"
          />
        }
      />
    </DiffusionProvider>
  );
};

export default DiffusionPage;


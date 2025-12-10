// src/pages/EpidemicSpread.tsx
'use client';

import React, { useEffect } from 'react';
import EpidemicSpreadCard from '@components/EpidemicSpreadCard';
import EpidemicSpreadStatsCard from '@components/EpidemicSpreadStatsCard';
import EpidemicSpreadHelpCard from '@components/EpidemicSpreadHelpCard';
import EpidemicSpreadTheorieCard from '@components/EpidemicSpreadTheorieCard';
import EpidemicSpreadControl from '@components/EpidemicSpreadControl';
import { EpidemicSpreadProvider } from '@context/EpidemicSpreadContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import SimulationRightTabs from '@components/layout/SimulationRightTabs';

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
        right={
          <SimulationRightTabs
            tabs={[
              {
                id: 'controls',
                label: 'Controls',
                content: <EpidemicSpreadControl />,
              },
              {
                id: 'stats',
                label: 'Statistics',
                content: <EpidemicSpreadStatsCard />,
              },
              {
                id: 'help',
                label: 'Help',
                content: <EpidemicSpreadHelpCard />,
              },
              {
                id: 'theorie',
                label: 'Theory',
                content: <EpidemicSpreadTheorieCard />,
              },
            ]}
            initialActiveId="controls"
          />
        }
      />
    </EpidemicSpreadProvider>
  );
};

export default EpidemicSpreadPage;
 
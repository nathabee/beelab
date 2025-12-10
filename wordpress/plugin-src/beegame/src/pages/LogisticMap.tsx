'use client';

import React, { useEffect } from 'react';
import { useApp } from '@context/AppContext';
import LogisticMapCard from '@components/LogisticMapCard';
import LogisticMapStatsCard from '@components/LogisticMapStatsCard';
import LogisticMapHelpCard from '@components/LogisticMapHelpCard';
import LogisticMapTheorieCard from '@components/LogisticMapTheorieCard';
import LogisticMapControl from '@components/LogisticMapControl';
import { LogisticMapProvider } from '@context/LogisticMapContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import SimulationRightTabs from '@components/layout/SimulationRightTabs';


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
        right={
          <SimulationRightTabs
            tabs={[
              {
                id: 'controls',
                label: 'Controls',
                content: <LogisticMapControl />,
              },
              {
                id: 'stats',
                label: 'Statistics',
                content: <LogisticMapStatsCard />,
              },
              {
                id: 'help',
                label: 'Help',
                content: <LogisticMapHelpCard />,
              },
              {
                id: 'theorie',
                label: 'Theory',
                content: <LogisticMapTheorieCard />,
              },
            ]}
            initialActiveId="controls"
          />
        }
        
      />
    </LogisticMapProvider>
  );
};

export default LogisticMapPage;

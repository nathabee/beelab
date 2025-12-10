// src/pages/ForestFire.tsx
'use client';

import React, { useEffect } from 'react';
import ForestFireCard from '@components/ForestFireCard';
import ForestFireStatsCard from '@components/ForestFireStatsCard';
import ForestFireHelpCard from '@components/ForestFireHelpCard';
import ForestFireTheorieCard from '@components/ForestFireTheorieCard';
import ForestFireControl from '@components/ForestFireControl';
import { ForestFireProvider } from '@context/ForestFireContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import SimulationRightTabs from '@components/layout/SimulationRightTabs';
import { useApp } from '@context/AppContext';



const ForestFirePage: React.FC = () => {
    const { setActiveGame } = useApp();
    useEffect(() => {
        setActiveGame('forestFire');
    }, [setActiveGame]);


  return (
    <ForestFireProvider>
      <SimulationLayout
        title="Burning Forest"
        left={<ForestFireCard />}
        right={
          <SimulationRightTabs
            tabs={[
              {
                id: 'controls',
                label: 'Controls',
                content: <ForestFireControl />,
              },
              {
                id: 'stats',
                label: 'Statistics',
                content: <ForestFireStatsCard />,
              },
              {
                id: 'help',
                label: 'Help',
                content: <ForestFireHelpCard />,
              },
              {
                id: 'theorie',
                label: 'Theory',
                content: <ForestFireTheorieCard />,
              },
            ]}
            initialActiveId="controls"
          />
        }
      />
    </ForestFireProvider>
  );
};

export default ForestFirePage;

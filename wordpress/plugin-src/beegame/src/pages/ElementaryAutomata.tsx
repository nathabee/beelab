// src/pages/ElementaryAutomata.tsx
'use client';

import React, { useEffect } from 'react';
import ElementaryAutomataCard from '@components/ElementaryAutomataCard';
import ElementaryAutomataStatsCard from '@components/ElementaryAutomataStatsCard';
import ElementaryAutomataHelpCard from '@components/ElementaryAutomataHelpCard';
import ElementaryAutomataTheorieCard from '@components/ElementaryAutomataTheorieCard';
import ElementaryAutomataControl from '@components/ElementaryAutomataControl';
import { ElementaryAutomataProvider } from '@context/ElementaryAutomataContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import SimulationRightTabs from '@components/layout/SimulationRightTabs';

import { useApp } from '@context/AppContext';

const ElementaryAutomataPage: React.FC = () => {
  const { setActiveGame } = useApp();
  useEffect(() => {
    setActiveGame('elementary');
  }, [setActiveGame]);

  return (
    <ElementaryAutomataProvider>
      <SimulationLayout
        title="Elementary Cellular Automata"
        left={<ElementaryAutomataCard />}
        right={
          <SimulationRightTabs
            tabs={[
              {
                id: 'controls',
                label: 'Controls',
                content: <ElementaryAutomataControl />,
              },
              {
                id: 'stats',
                label: 'Statistics',
                content: <ElementaryAutomataStatsCard />,
              },
              {
                id: 'help',
                label: 'Help',
                content: <ElementaryAutomataHelpCard />,
              },
              {
                id: 'theorie',
                label: 'Theory',
                content: <ElementaryAutomataTheorieCard />,
              },
            ]}
            initialActiveId="controls"
          />
        }
      />
    </ElementaryAutomataProvider>
  );
};

export default ElementaryAutomataPage;



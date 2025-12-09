// src/pages/ElementaryAutomata.tsx
'use client';

import React, { useEffect } from 'react';
import { ElementaryAutomataProvider } from '@context/ElementaryAutomataContext';
import ElementaryAutomataCard from '@components/ElementaryAutomataCard';
import ElementaryAutomataControl from '@components/ElementaryAutomataControl';
import SimulationLayout from '@components/layout/SimulationLayout';
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
        right={<ElementaryAutomataControl />}
      />
    </ElementaryAutomataProvider>
  );
};

export default ElementaryAutomataPage;

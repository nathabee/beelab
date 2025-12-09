// src/pages/ForestFire.tsx
'use client';

import React, { useEffect } from 'react';
import ForestFireCard from '@components/ForestFireCard';
import ForestFireControl from '@components/ForestFireControl';
import { ForestFireProvider } from '@context/ForestFireContext';
import SimulationLayout from '@components/layout/SimulationLayout';
import { useApp } from '@context/AppContext';



const ForestFirePage: React.FC = () => {
    const { setActiveGame } = useApp();
    useEffect(() => {
        setActiveGame('forestFire');
    }, [setActiveGame]);

    return (
        <ForestFireProvider>
            <SimulationLayout
                title="Forest Fire Automaton"
                left={<ForestFireCard />}
                right={<ForestFireControl />}
            />
        </ForestFireProvider>
    );
};

export default ForestFirePage;

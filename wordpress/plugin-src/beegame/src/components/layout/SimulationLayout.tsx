// src/components/layout/SimulationLayout.tsx
'use client';

import React from 'react';

type SimulationLayoutProps = {
  title: string;
  left: React.ReactNode;   // grid/card
  right: React.ReactNode;  // controls
};

const SimulationLayout: React.FC<SimulationLayoutProps> = ({ title, left, right }) => (
  <div className="bee-beegame-simulation">
    <h1 className="h4 mb-3">{title}</h1>
    <div className="row g-3">
      <div className="col-md-8">{left}</div>
      <div className="col-md-4">{right}</div>
    </div>
  </div>
);

export default SimulationLayout;


 

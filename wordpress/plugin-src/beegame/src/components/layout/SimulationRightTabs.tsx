// src/components/layout/SimulationRightTabs.tsx
'use client';

import React, { useState } from 'react';

export type SimulationTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type SimulationRightTabsProps = {
  tabs: SimulationTab[];
  initialActiveId?: string;
};

const SimulationRightTabs: React.FC<SimulationRightTabsProps> = ({
  tabs,
  initialActiveId,
}) => {
  if (!tabs.length) {
    return null;
  }

  const defaultActiveId = initialActiveId ?? tabs[0].id;
  const [activeId, setActiveId] = useState<string>(defaultActiveId);

  const activeTab = tabs.find(t => t.id === activeId) ?? tabs[0];

  return (
    <div className="card">
      <div className="card-header pb-0 border-bottom-0">
        <ul className="nav nav-tabs card-header-tabs">
          {tabs.map(tab => (
            <li key={tab.id} className="nav-item">
              <button
                type="button"
                className={
                  'nav-link ' + (tab.id === activeId ? 'active' : '')
                }
                onClick={() => setActiveId(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card-body">
        {activeTab.content}
      </div>
    </div>
  );
};

export default SimulationRightTabs;

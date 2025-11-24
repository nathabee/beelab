// src/components/ActiveContextCard.tsx
'use client';
import React from 'react';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';

const ActiveContextCard: React.FC = () => {
  const { activeFarm, activeField } = useApp();
  const { user  } = useUser();


  console.log('[ActiveContextCard] component called');



  return (
    <div className="card p-3">
      <h3>🔎 Active Context</h3>
      <ul className="mb-0">
        <li><strong>👨‍🌾 User:</strong> {user ? `${user.first_name} ${user.last_name} (${user.username})` : 'Not logged in'}</li>
        <li><strong>🏡 Farm:</strong> {activeFarm ? activeFarm.name : 'None selected'}</li>
        <li><strong>🗺️ Field:</strong> {activeField ? `${activeField.name} (${activeField.short_name})` : 'None selected'}</li>
      </ul>
    </div>
  );
};

export default ActiveContextCard;

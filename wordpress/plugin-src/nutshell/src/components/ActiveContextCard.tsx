'use client';

import React from 'react';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import {formatDate} from '@utils/helper'; 

const ActiveContextCard: React.FC = () => {
  const { activeEleve, activeCatalogues, activeLayout,  activeReport} = useApp();
  const { user  } = useUser();


  return (
    <div className="active-context-card">
      <h3>🔎 Active Context</h3>
      <ul>
        <li><strong>👤 Nut:</strong> {activeEleve ? `${activeEleve.prenom} ${activeEleve.nom}` : 'Aucun élève sélectionné'}</li>
        </li>
        <li><strong>👨‍🏫 User:</strong> {user ? `${user.first_name} ${user.last_name}` : 'Non connecté'}</li>
              </ul>
    </div>
  );
};

export default ActiveContextCard;

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
        <li><strong>👤 Élève:</strong> {activeEleve ? `${activeEleve.prenom} ${activeEleve.nom}` : 'Aucun élève sélectionné'}</li>
        <li><strong>📚 Catalogue(s):</strong> {activeCatalogues?.length > 0
          ? activeCatalogues.map(c => c.description).join(', ')
          : 'Aucun catalogue sélectionné'}
        </li>
        <li><strong>📝 Layout:</strong> {activeLayout ? `Layout #${activeLayout.id}` : 'Aucune mise en page sélectionnée'}</li>
        <li><strong>👨‍🏫 Professeur:</strong> {user ? `${user.first_name} ${user.last_name}` : 'Non connecté'}</li>
        <li><strong>📄 Report :</strong> {activeReport  ? `${activeReport.id} daté du ${formatDate(activeReport.updated_at)}` : 'Pas de rapport sélectionné'}</li>
      </ul>
    </div>
  );
};

export default ActiveContextCard;

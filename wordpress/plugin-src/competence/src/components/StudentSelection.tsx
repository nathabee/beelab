'use client';

import React, { useState } from 'react';
import { useApp } from '@context/AppContext';
import { EleveSelectionProps, Eleve } from '@mytypes/eleve';

const StudentSelection: React.FC<EleveSelectionProps> = ({ eleves }) => {
  const { activeEleve, setActiveEleve} = useApp();
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const uniqueLevels = Array.from(new Set(eleves.map(s => s.niveau_description)));

  const filteredStudents = eleves.filter(s => !levelFilter || s.niveau_description === levelFilter);

  return (
    <div>
      <h2>Select a Student</h2>

      <select
        className="form-control mb-3"
        value={levelFilter || ''}
        onChange={e => setLevelFilter(e.target.value || null)}
      >
        <option value="">All Levels</option>
        {uniqueLevels.map((lvl, idx) => (
          <option key={idx} value={lvl}>{lvl}</option>
        ))}
      </select>

      <table className="table table-hover">
        <thead>
          <tr>
            <th>Last</th><th>First</th><th>Level</th><th>Birthdate</th><th>Teachers</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map(s => (
            <tr key={s.id} onClick={() => setActiveEleve(s)} style={{ cursor: 'pointer' }} className={activeEleve?.id === s.id ? 'table-primary' : ''}>
              <td>{s.nom}</td>
              <td>{s.prenom}</td>
              <td>{s.niveau_description}</td>
              <td>{s.datenaissance}</td>
              <td>{s.professeurs_details?.map(p => p.username).join(', ') || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentSelection;

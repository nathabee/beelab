'use client';

import React from 'react';
import { Catalogue } from '@mytypes/report'; // Your existing type
 

interface CatalogueDisplayProps {
  selectedCatalogue: Catalogue[];
}

const CatalogueDisplay: React.FC<CatalogueDisplayProps> = ({ selectedCatalogue }) => {
  if (!selectedCatalogue.length) return <p>No catalogue selected</p>;

  return (
    <div className="mb-4">
      <table className="table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Level</th>
            <th>Stage</th>
            <th>Subject</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {selectedCatalogue.map((cat) => (
            <tr key={cat.id} className="selected-row">
              <td>{cat.annee.annee}</td>
              <td>{cat.niveau.niveau}</td>
              <td>{cat.etape.etape}</td>
              <td>{cat.matiere.matiere}</td>
              <td>{cat.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CatalogueDisplay;

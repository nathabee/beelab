'use client';

import React, { useState } from 'react';
import { CatalogueSelectionProps, Catalogue } from '@mytypes/report';
import { useApp } from '@context/AppContext';


const CatalogueSelection: React.FC<CatalogueSelectionProps> = ({ catalogue }) => {
  const { activeCatalogues, setActiveCatalogues } = useApp();

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  if (!catalogue.length) return <p>No catalogue found...</p>;

  const unique = <T extends string>(list: T[]) => Array.from(new Set(list));

  const filteredCatalogue = catalogue.filter(cat =>
    (!selectedYear || cat.annee.annee === selectedYear) &&
    (!selectedLevel || cat.niveau.niveau === selectedLevel) &&
    (!selectedStage || cat.etape.etape === selectedStage) &&
    (!selectedSubject || cat.matiere.matiere === selectedSubject)
  );

  const handleRowClick = (selectedCat: Catalogue) => {
    const isSelected = activeCatalogues.some(cat => cat.id === selectedCat.id);
    const updated = isSelected
      ? activeCatalogues.filter(cat => cat.id !== selectedCat.id)
      : [...activeCatalogues, selectedCat];
    setActiveCatalogues(updated);
  };

  return (
    <div className="mb-4">
      {activeCatalogues.length > 1 && (
        <div className="alert alert-warning">Multiple catalogues selected</div>
      )}

      <div className="filters mb-3">
        <select className="form-control" value={selectedYear || ''} onChange={e => setSelectedYear(e.target.value || null)}>
          <option value="">All Years</option>
          {unique(catalogue.map(c => c.annee.annee)).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select className="form-control mt-2" value={selectedLevel || ''} onChange={e => setSelectedLevel(e.target.value || null)}>
          <option value="">All Levels</option>
          {unique(catalogue.map(c => c.niveau.niveau)).map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>

        <select className="form-control mt-2" value={selectedStage || ''} onChange={e => setSelectedStage(e.target.value || null)}>
          <option value="">All Stages</option>
          {unique(catalogue.map(c => c.etape.etape)).map(stage => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>

        <select className="form-control mt-2" value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value || null)}>
          <option value="">All Subjects</option>
          {unique(catalogue.map(c => c.matiere.matiere)).map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </div>

      <table className="table table-hover">
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
          {filteredCatalogue.map((cat) => (
            <tr
              key={cat.id}
              onClick={() => handleRowClick(cat)}
              className={activeCatalogues.some(c => c.id === cat.id) ? 'selected-row' : ''}
              style={{ cursor: 'pointer' }}
            >
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

export default CatalogueSelection;

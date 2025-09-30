'use client';

import React from 'react';
import { useApp } from '@context/AppContext';
import { useProtectedPage } from '@hooks/useProtectedPage';
import ActiveContextCard from '@components/ActiveContextCard';
import { UserDisplay } from '@bee/common';

import StudentDisplay from '@components/StudentDisplay';
import CatalogueDisplay from '@components/CatalogueDisplay';
import LayoutDisplay from '@components/LayoutDisplay';

import SummaryScore from '@components/SummaryScore';
import SummaryDifficulty from '@components/SummaryDifficulty';
import SummaryDetailedDifficulty from '@components/SummaryDetailedDifficulty';

import { useUser } from '@bee/common';
 
const OverviewTest: React.FC = () => {
  useProtectedPage(); // ✅ token check and redirect if expired

  const { user  } = useUser();

  const {
    activeEleve,
    activeReport,
    activeCatalogues,
    activeLayout,
    } = useApp();

  return (
    <div className="container mt-3 ml-2">
      <ActiveContextCard />

      {(!activeEleve || !activeCatalogues?.length || !activeLayout || !user) ? (
        <p className="text-warning mt-3">
          ⚠️ Veuillez d'abord sélectionner un élève, un catalogue, une mise en page et être connecté.
        </p>
      ) : (
        <>
          <h1>🧾 Overview Test</h1>

          <h3>👨‍🏫 Professor:</h3>
          <UserDisplay user={user} />

          <h3>👧 Student:</h3>
          <StudentDisplay student={activeEleve} />

          <h3>📚 Catalogue(s):</h3>
          <CatalogueDisplay selectedCatalogue={activeCatalogues} />

          <h3>📄 Layout:</h3>
          <LayoutDisplay layout={activeLayout} />

          <h3>📊 Score Summary:</h3>
          <SummaryScore report_catalogues={activeReport?.report_catalogues ?? []} />

          <h3>⚠️ Difficulty Summary:</h3>
          <SummaryDifficulty report_catalogues={activeReport?.report_catalogues ?? []} />

          <h3>🔍 Detailed Problem Report:</h3>
          <SummaryDetailedDifficulty
            eleve={activeEleve}
            professor={user}
            pdflayout={activeLayout}
            report={activeReport}
            max_item={40}
            self_page={true}
          />
        </>
      )}
    </div>
  );
};

export default OverviewTest;

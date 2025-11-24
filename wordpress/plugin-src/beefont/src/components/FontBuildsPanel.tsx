// src/components/FontBuildsPanel.tsx
'use client';

import React, { useMemo } from 'react';

import useFontBuild from '@hooks/useFontBuild';
import { friendlyMessage, type AppError } from '@bee/common/error';

type FontBuildsPanelProps = {
  sid?: string;
};

const FontBuildsPanel: React.FC<FontBuildsPanelProps> = ({ sid = '' }) => {
  const {
    builds,
    isLoadingBuilds,
    isBuilding,
    error,
    fetchBuilds,
    downloadTtf,      // NEW
    downloadZip,      // NEW
  } = useFontBuild(sid, { manual: false });

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  const handleDownloadZip = () => {
    downloadZip().catch(err => {
      console.error('[FontBuildsPanel] download ZIP failed:', err);
    });
  };

  const handleDownloadTtf = (languageCode: string) => {
    downloadTtf(languageCode).catch(err => {
      console.error('[FontBuildsPanel] download TTF failed:', err);
    });
  };

  return (
    <section className="bf-panel bf-panel--font-builds">
      <div className="bf-panel__header">
        <h2>Font builds</h2>
        {(isLoadingBuilds || isBuilding) && (
          <span className="bf-panel__status">
            {isLoadingBuilds ? 'Loading… ' : ''}
            {isBuilding ? 'Building…' : ''}
          </span>
        )}
      </div>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {!isLoadingBuilds && builds.length === 0 && !error && (
        <p>No fonts have been built for this job yet.</p>
      )}

      {builds.length > 0 && (
        <table className="bf-table bf-table--font-builds">
          <thead>
            <tr>
              <th>Language</th>
              <th>Created at</th>
              <th>Status</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {builds.map(build => {
              const isOk = build.success && !!build.ttf_path;
              const created = new Date(build.created_at);
              const createdStr = created.toLocaleString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <tr key={build.id}>
                  <td>{build.language_code}</td>
                  <td>{createdStr}</td>
                  <td>
                    {isOk ? (
                      <span className="bf-badge bf-badge--success">OK</span>
                    ) : (
                      <span className="bf-badge bf-badge--error">failed</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="bf-button bf-button--small"
                      onClick={() => handleDownloadTtf(build.language_code)}
                      disabled={!isOk}
                    >
                      Download TTF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="bf-panel__actions">
        <button
          type="button"
          className="bf-button bf-button--small"
          onClick={() => {
            fetchBuilds().catch(err => {
              console.error('[FontBuildsPanel] refresh builds failed:', err);
            });
          }}
          disabled={isLoadingBuilds}
        >
          Refresh list
        </button>

        <button
          type="button"
          className="bf-button bf-button--small"
          onClick={handleDownloadZip}
          disabled={builds.length === 0}
        >
          Download all fonts (ZIP)
        </button>
      </div>
    </section>
  );
};

export default FontBuildsPanel;

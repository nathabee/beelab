// src/components/FontBuildsPanel.tsx
'use client';

import React, { useMemo, useState } from 'react';

import useFontBuild from '@hooks/useFontBuild';
import { friendlyMessage, type AppError } from '@bee/common/error';
import FontTestPanel from '@components/FontTestPanel';

type FontBuildsPanelProps = {
  sid?: string;
  jobName?: string | null;
};

const FontBuildsPanel: React.FC<FontBuildsPanelProps> = ({
  sid = '',
  jobName = null,
}) => {
  const {
    builds,
    isLoadingBuilds,
    isBuilding,
    error,
    fetchBuilds,
    downloadTtf,
    downloadZip,
    getTtfDownloadUrl,
  } = useFontBuild(sid, { manual: false });

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  const [previewLanguage, setPreviewLanguage] = useState<string | null>(null);
  const [previewFontUrl, setPreviewFontUrl] = useState<string | null>(null);

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

  const handleTestFont = (languageCode: string) => {
    const url = getTtfDownloadUrl(languageCode);
    if (!url) {
      console.warn('[FontBuildsPanel] No TTF URL for language', languageCode);
      return;
    }
    setPreviewLanguage(languageCode);
    setPreviewFontUrl(url);
  };

  const handleClosePreview = () => {
    setPreviewLanguage(null);
    setPreviewFontUrl(null);
  };

  return (
    <section className="bf-panel bf-panel--font-builds">
      <div className="bf-panel__header">
        <h2>Font builds</h2>
        {(isLoadingBuilds || isBuilding) && (
          <span className="bf-panel__status">
            {isLoadingBuilds ? 'Loading builds… ' : ''}
            {isBuilding ? 'Building…' : ''}
          </span>
        )}
      </div>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {isLoadingBuilds && builds.length === 0 && !error && (
        <div className="bf-loading">
          Loading build history…
        </div>
      )}

      {!isLoadingBuilds && builds.length === 0 && !error && (
        <p>No fonts have been built for this job yet.</p>
      )}

      {builds.length > 0 && (
        <table className="bf-table bf-table--font-builds">
          <thead>
            <tr>
              <th>ID</th>
              <th>Language</th>
              <th>Created at</th>
              <th>Status</th>
              <th>Download</th>
              <th>Test</th>
            </tr>
          </thead>
          <tbody>
            {builds.map(build => {
              const lang = build.language_code ?? '';
              const isOk = build.success && !!build.ttf_path;

              const created = build.created_at
                ? new Date(build.created_at)
                : null;
              const createdStr = created
                ? created.toLocaleString('de-DE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'n/a';

              const canTest =
                !!lang &&
                !!build.success &&
                !!getTtfDownloadUrl(lang);

              return (
                <tr key={build.id}>
                  <td>{build.id}</td>
                  <td>{lang || '-'}</td>
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
                      onClick={() => handleDownloadTtf(lang)}
                      disabled={!isOk}
                    >
                      Download TTF
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="bf-button bf-button--small bf-button--secondary"
                      onClick={() => handleTestFont(lang)}
                      disabled={!canTest}
                    >
                      Test font
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

      {previewFontUrl && (
        <FontTestPanel
          fontUrl={previewFontUrl}
          languageCode={previewLanguage ?? undefined}
          jobName={jobName ?? undefined}
          onClose={handleClosePreview}
        />
      )}
    </section>
  );
};

export default FontBuildsPanel;

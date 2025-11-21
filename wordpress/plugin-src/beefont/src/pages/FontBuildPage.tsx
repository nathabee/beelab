// src/pages/FontBuildPage.tsx
//
'use client';

import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useJobDetail from '@hooks/useJobDetail';
import useFontBuild from '@hooks/useFontBuild';

import LanguageStatusList from '@components/LanguageStatusList';

import { friendlyMessage, type AppError } from '@bee/common/error';

const FontBuildPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sid = searchParams.get('sid') ?? '';
  const preselectedLanguage = searchParams.get('language') ?? '';

  const {
    job,
    languageStatuses,
    isLoading: isJobLoading,
    error: jobError,
  } = useJobDetail(sid || '');

  const {
    builds,
    isLoadingBuilds,
    isBuilding,
    error: buildError,
    buildLanguage,
    getTtfDownloadUrl,
    getZipDownloadUrl,
  } = useFontBuild(sid || '');

  const error = jobError ?? buildError ?? null;

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  if (!sid) {
    return (
      <section className="bf-page bf-page--font-build">
        <header className="bf-page__header">
          <h1>BeeFont – Builds and downloads</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen.
        </div>
      </section>
    );
  }

  // Derive which languages already have a successful build
  const languagesWithBuild = useMemo(() => {
    const set = new Set<string>();
    builds.forEach(b => {
      if (b.success && b.language_code) {
        set.add(b.language_code);
      }
    });
    return set;
  }, [builds]);

  const handleBackToJob = () => {
    navigate(`/jobDetail?sid=${encodeURIComponent(sid)}`);
  };

  const handleBuildFont = async (languageCode: string) => {
    await buildLanguage(languageCode).catch(err => {
      console.error('[FontBuildPage] buildLanguage failed:', err);
    });
  };

  const handleShowMissing = (languageCode: string) => {
    navigate(
      `/missingcharacters?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(languageCode)}`,
    );
  };

  const getTtfUrl = (languageCode: string): string | null => {
    // Only show a TTF link if there is at least one successful build for this language.
    if (!languagesWithBuild.has(languageCode)) return null;
    return getTtfDownloadUrl(languageCode);
  };

  return (
    <section className="bf-page bf-page--font-build">
      <header className="bf-page__header">
        <h1>BeeFont – Builds and downloads</h1>
        <p className="bf-page__subtitle">
          Build fonts per language and download TTF files or a ZIP bundle.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      <section className="bf-panel bf-panel--context">
        <h2>Job</h2>
        {isJobLoading && !job && (
          <div className="bf-loading">Loading job…</div>
        )}
        {job && (
          <dl className="bf-definition-list">
            <div className="bf-definition-list__row">
              <dt>Job SID</dt>
              <dd>{job.sid}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Name</dt>
              <dd>{job.name}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Base family</dt>
              <dd>{job.base_family || 'n/a'}</dd>
            </div>
          </dl>
        )}
        <div className="bf-panel__actions">
          <button
            type="button"
            className="bf-button bf-button--small"
            onClick={handleBackToJob}
          >
            Back to job detail
          </button>
        </div>
      </section>

      <section className="bf-panel bf-panel--languages">
        <div className="bf-panel__header">
          <h2>Languages</h2>
          {(isLoadingBuilds || isBuilding) && (
            <span className="bf-panel__status">
              {isLoadingBuilds ? 'Loading builds… ' : ''}
              {isBuilding ? 'Building…' : ''}
            </span>
          )}
        </div>

        {languageStatuses.length === 0 && !isJobLoading && (
          <p>No languages available for this job.</p>
        )}

        {languageStatuses.length > 0 && (
          <LanguageStatusList
            items={languageStatuses}
            onBuildFont={handleBuildFont}
            onShowMissing={handleShowMissing}
            getTtfUrl={getTtfUrl}
          />
        )}

        <div className="bf-panel__actions">
          <a
            href={getZipDownloadUrl()}
            className="bf-button bf-button--secondary"
          >
            Download ZIP (all fonts)
          </a>
        </div>
      </section>

      <section className="bf-panel bf-panel--history">
        <h2>Build history</h2>

        {isLoadingBuilds && builds.length === 0 && (
          <div className="bf-loading">
            Loading build history…
          </div>
        )}

        {!isLoadingBuilds && builds.length === 0 && !buildError && (
          <p>No builds yet. Use “Build font” above to create your first TTF.</p>
        )}

        {builds.length > 0 && (
          <table className="bf-table bf-table--builds">
            <thead>
              <tr>
                <th>ID</th>
                <th>Language</th>
                <th>Created at</th>
                <th>Success</th>
              </tr>
            </thead>
            <tbody>
              {builds.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.language_code ?? '-'}</td>
                  <td>
                    {b.created_at
                      ? new Date(b.created_at).toLocaleString()
                      : 'n/a'}
                  </td>
                  <td>{b.success ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};

export default FontBuildPage;

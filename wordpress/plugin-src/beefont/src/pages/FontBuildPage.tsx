// src/pages/FontBuildPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useApp } from '@context/AppContext';
import useJobDetail from '@hooks/useJobDetail';
import useFontBuild from '@hooks/useFontBuild';

import LanguageStatusList from '@components/LanguageStatusList';
import FontBuildsPanel from '@components/FontBuildsPanel';

import { friendlyMessage, type AppError } from '@bee/common/error';

const FontBuildPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sidParam = searchParams.get('sid') ?? '';
  const preselectedLanguage = searchParams.get('language') ?? '';

  const { activeJob } = useApp();

  const effectiveSid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  const {
    job,
    languageStatuses,
    isLoading: isJobLoading,
    error: jobError,
  } = useJobDetail(effectiveSid || '');

  const {
    builds,
    isLoadingBuilds,
    isBuilding,
    error: buildError,
    buildLanguage,
    getTtfDownloadUrl,
    downloadTtf,
  } = useFontBuild(effectiveSid || '');

  const error = jobError ?? buildError ?? null;
  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );


  if (!effectiveSid) {
    return (
      <section className="bf-page bf-page--font-build">
        <header className="bf-page__header">
          <h1>BeeFont – Builds and downloads</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen or select a job first.
        </div>
      </section>
    );
  }

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
    navigate(`/jobDetail?sid=${encodeURIComponent(effectiveSid)}`);
  };

  const handleBuildFont = async (languageCode: string) => {
    await buildLanguage(languageCode).catch(err => {
      console.error('[FontBuildPage] buildLanguage failed:', err);
    });
  };

  const handleShowMissing = (languageCode: string) => {
    navigate(
      `/missingcharacters?sid=${encodeURIComponent(
        effectiveSid,
      )}&language=${encodeURIComponent(languageCode)}`,
    );
  };

  const getTtfUrl = (languageCode: string): string | null => {
    if (!languagesWithBuild.has(languageCode)) return null;
    return getTtfDownloadUrl(languageCode);
  };

  const handleDownloadTtf = (languageCode: string) => {
    downloadTtf(languageCode).catch(err => {
      console.error('[FontBuildPage] downloadTtf failed:', err);
    });
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
            onDownloadTtf={handleDownloadTtf}
          />
        )}


        {/* Shared build history + test panel */}
        <FontBuildsPanel sid={effectiveSid} jobName={job?.name ?? null} />

      </section>
    </section>
  );
};

export default FontBuildPage;

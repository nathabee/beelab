// src/pages/JobDetailPage.tsx
'use client';

import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useJobDetail from '@hooks/useJobDetail';
import usePages from '@hooks/usePages';
import useFontBuild from '@hooks/useFontBuild';

import LanguageStatusList from '@components/LanguageStatusList';
import PagesTable from '@components/PagesTable';
import FontBuildsPanel from '@components/FontBuildsPanel';

import { friendlyMessage, type AppError } from '@bee/common/error';

const JobDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sid = searchParams.get('sid') ?? '';

  const {
    job,
    languageStatuses,
    isLoading: isJobLoading,
    isRefreshing,
    error: jobError,
    reload,
  } = useJobDetail(sid);

  const {
    pages,
    isLoading: isPagesLoading,
    isDeleting,
    isAnalysing,
    error: pagesError,
    retryAnalysis,
    deletePage,
  } = usePages(sid);

  // Hook only for build + download; no auto-fetches of history
  const {
    isBuilding,
    error: buildError,
    buildLanguage,
    downloadTtf,
  } = useFontBuild(sid, { manual: true });

  const isLoading = isJobLoading || isPagesLoading;
  const combinedError = jobError ?? pagesError ?? buildError ?? null;

  const errorText = useMemo(
    () => (combinedError ? friendlyMessage(combinedError as AppError) : null),
    [combinedError],
  );

  if (!sid) {
    return (
      <section className="bf-page bf-page--job-detail">
        <header className="bf-page__header">
          <h1>BeeFont – Job detail</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page via the job overview.
        </div>
      </section>
    );
  }

  const handleOpenPrintUpload = () => {
    navigate(`/printupload?sid=${encodeURIComponent(sid)}`);
  };

  const handleOpenGlyphBrowser = () => {
    navigate(`/glyphbrowser?sid=${encodeURIComponent(sid)}`);
  };

  const handleShowMissing = (languageCode: string) => {
    navigate(
      `/missingcharacters?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(languageCode)}`,
    );
  };

  // Build handler: POST /jobs/{sid}/build-ttf/
  const handleBuild = (languageCode: string) => {
    buildLanguage(languageCode)
      .then(build => {
        console.log('[JobDetailPage] buildLanguage OK:', build);
        // Optional: reload() if you want statuses refreshed immediately
      })
      .catch(err => {
        console.error('[JobDetailPage] buildLanguage failed:', err);
      });
  };

  // Download handler – goes through hook (with auth)
  const handleDownloadTtf = (languageCode: string) => {
    downloadTtf(languageCode)
      .then(() => {
        console.log('[JobDetailPage] downloadTtf OK for', languageCode);
      })
      .catch(err => {
        console.error('[JobDetailPage] downloadTtf failed:', err);
      });
  };

  const handleOpenDebugForPage = (pageId: number) => {
    navigate(`/glyphbrowser?sid=${encodeURIComponent(sid)}&pageId=${pageId}`);
  };

  const handleRetryAnalysis = async (pageId: number) => {
    await retryAnalysis(pageId)
      .then(() => reload())
      .catch(err => {
        console.error('[JobDetailPage] retryAnalysis failed:', err);
      });
  };

  const handleDeletePage = async (pageId: number) => {
    const ok = window.confirm(
      'Do you really want to delete this page? This cannot be undone.',
    );
    if (!ok) return;

    await deletePage(pageId)
      .then(() => reload())
      .catch(err => {
        console.error('[JobDetailPage] deletePage failed:', err);
      });
  };

  return (
    <section className="bf-page bf-page--job-detail">
      <header className="bf-page__header">
        <h1>BeeFont – Job detail</h1>
        <p className="bf-page__subtitle">
          {job?.name || sid}
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {(isLoading || isBuilding) && (
        <div className="bf-loading">
          {isLoading ? 'Loading job…' : ''}
          {isBuilding ? ' Building font…' : ''}
        </div>
      )}

      {!isLoading && job && (
        <>
          {/* Metadata */}
          <section className="bf-panel bf-panel--metadata">
            <h2>Metadata</h2>
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
              <div className="bf-definition-list__row">
                <dt>Created at</dt>
                <dd>
                  {job.created_at
                    ? new Date(job.created_at).toLocaleString()
                    : 'n/a'}
                </dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Pages</dt>
                <dd>{job.page_count}</dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Glyphs</dt>
                <dd>{job.glyph_count}</dd>
              </div>
            </dl>
          </section>

          {/* Languages */}
          <section className="bf-panel bf-panel--languages">
            <div className="bf-panel__header">
              <h2>Languages</h2>
              {isRefreshing && (
                <span className="bf-panel__status">
                  Refreshing…
                </span>
              )}
            </div>

            <LanguageStatusList
              items={languageStatuses}
              onBuildFont={handleBuild}
              onShowMissing={handleShowMissing}
              onDownloadTtf={handleDownloadTtf}
            />
          </section>

          {/* Pages */}
          <section className="bf-panel bf-panel--pages">
            <div className="bf-panel__header">
              <h2>Pages</h2>
              {(isAnalysing || isDeleting) && (
                <span className="bf-panel__status">
                  {isAnalysing ? 'Re-analysing… ' : ''}
                  {isDeleting ? 'Deleting…' : ''}
                </span>
              )}
            </div>

            <PagesTable
              pages={pages}
              onOpenDebug={handleOpenDebugForPage}
              onRetryAnalysis={handleRetryAnalysis}
              onDelete={handleDeletePage}
            />
          </section>

          {/* Job-level actions */}
          <section className="bf-panel bf-panel--actions">
            <h2>Job actions</h2>
            <div className="bf-panel__actions">
              <button
                type="button"
                className="bf-button"
                onClick={handleOpenPrintUpload}
              >
                Add pages for a language
              </button>
              <button
                type="button"
                className="bf-button"
                onClick={handleOpenGlyphBrowser}
              >
                Open glyph browser
              </button>
            </div>
          </section>

          {/* Font builds for this job */}
          <FontBuildsPanel sid={sid} />
        </>
      )}

      {!isLoading && !job && !combinedError && (
        <div className="bf-alert bf-alert--warning">
          Job not found.
        </div>
      )}
    </section>
  );
};

export default JobDetailPage;

'use client';

// src/pages/JobDetailPage.tsx
//

import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useJobDetail from '@hooks/useJobDetail';
import usePages from '@hooks/usePages';

import LanguageStatusList from '@components/LanguageStatusList';
import PagesTable from '@components/PagesTable';

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

  const isLoading = isJobLoading || isPagesLoading;
  const error = jobError ?? pagesError ?? null;

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
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

  const handleOpenTemplateAlphabet = () => {
    navigate(`/templatealphabet?sid=${encodeURIComponent(sid)}`);
  };

  const handleOpenGlyphBrowser = () => {
    navigate(`/glyphbrowser?sid=${encodeURIComponent(sid)}`);
  };

  const handleOpenBuilds = () => {
    navigate(`/fontBuildPage?sid=${encodeURIComponent(sid)}`);
  };

  const handleShowMissing = (languageCode: string) => {
    navigate(
      `/missingcharacters?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(languageCode)}`,
    );
  };

  const handleBuildFont = (languageCode: string) => {
    // For now delegate actual build to FontBuildPage.
    navigate(
      `/fontBuildPage?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(languageCode)}`,
    );
  };

  const handleOpenDebugForPage = (pageId: number) => {
    // For now we just jump to glyph browser; later you may add a dedicated debug page.
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

      {isLoading && (
        <div className="bf-loading">
          Loading job…
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
              onBuildFont={handleBuildFont}
              onShowMissing={handleShowMissing}
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
                onClick={handleOpenTemplateAlphabet}
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
              <button
                type="button"
                className="bf-button"
                onClick={handleOpenBuilds}
              >
                Open builds / downloads
              </button>
            </div>
          </section>
        </>
      )}

      {!isLoading && !job && !error && (
        <div className="bf-alert bf-alert--warning">
          Job not found.
        </div>
      )}
    </section>
  );
};

export default JobDetailPage;

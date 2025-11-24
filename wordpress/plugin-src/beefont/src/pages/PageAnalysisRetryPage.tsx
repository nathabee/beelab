// src/pages/PageAnalysisRetryPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useJobDetail from '@hooks/useJobDetail';
import usePages from '@hooks/usePages';

import { friendlyMessage, type AppError } from '@bee/common/error';

import type { JobPage } from '@mytypes/jobPage';

const PageAnalysisRetryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sid = searchParams.get('sid') ?? '';
  const pageIdParam = searchParams.get('pageId') ?? '';

  const pageId = pageIdParam ? Number(pageIdParam) : NaN;

  const {
    job,
    isLoading: isJobLoading,
    error: jobError,
  } = useJobDetail(sid || '');

  const {
    pages,
    isLoading: isPagesLoading,
    isAnalysing,
    error: pagesError,
    retryAnalysis,
  } = usePages(sid || '');

  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const error = jobError ?? pagesError ?? null;
  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  if (!sid || !pageIdParam) {
    return (
      <section className="bf-page bf-page--page-analysis">
        <header className="bf-page__header">
          <h1>BeeFont – Page analysis</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job or page specified. Open this screen from the job detail view.
        </div>
      </section>
    );
  }

  if (Number.isNaN(pageId)) {
    return (
      <section className="bf-page bf-page--page-analysis">
        <header className="bf-page__header">
          <h1>BeeFont – Page analysis</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          Invalid pageId in URL. It must be a numeric value.
        </div>
      </section>
    );
  }

  const page: JobPage | undefined = pages.find(p => p.id === pageId);

  const handleBackToJob = () => {
    navigate(`/jobDetail?sid=${encodeURIComponent(sid)}`);
  };

  const handleRetry = async () => {
    setLocalMessage(null);
    await retryAnalysis(pageId)
      .then(() => {
        setLocalMessage(
          'Re-analysis triggered. Glyph variants may have changed; review them in the glyph browser.',
        );
      })
      .catch(err => {
        console.error('[PageAnalysisRetryPage] retryAnalysis failed:', err);
      });
  };

  return (
    <section className="bf-page bf-page--page-analysis">
      <header className="bf-page__header">
        <h1>BeeFont – Page analysis</h1>
        <p className="bf-page__subtitle">
          Re-run segmentation for a single page. This may change glyph variants for its letters.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {localMessage && (
        <div className="bf-alert bf-alert--info">
          {localMessage}
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

      <section className="bf-panel bf-panel--page">
        <div className="bf-panel__header">
          <h2>Page</h2>
          {isPagesLoading && !page && (
            <span className="bf-panel__status">Loading page…</span>
          )}
          {isAnalysing && (
            <span className="bf-panel__status">Re-analysing…</span>
          )}
        </div>

        {!isPagesLoading && !page && !pagesError && (
          <div className="bf-alert bf-alert--warning">
            Page with ID {pageId} not found for this job.
          </div>
        )}

        {page && (
          <>
            <dl className="bf-definition-list">
              <div className="bf-definition-list__row">
                <dt>Page ID</dt>
                <dd>{page.id}</dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Page index</dt>
                <dd>{page.page_index ?? '(none)'}</dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Template</dt>
                <dd>{page.template?.code ?? 'n/a'}</dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Letters</dt>
                <dd>{page.letters}</dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Analysed at</dt>
                <dd>
                  {page.analysed_at
                    ? new Date(page.analysed_at).toLocaleString()
                    : 'not analysed yet'}
                </dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Created at</dt>
                <dd>
                  {page.created_at
                    ? new Date(page.created_at).toLocaleString()
                    : 'n/a'}
                </dd>
              </div>
            </dl>

            {page.scan_image_path && (
              <div className="bf-page__image">
                <h3>Scan preview</h3>
                <img
                  src={page.scan_image_path}
                  alt={`Scan for page ${page.id}`}
                />
              </div>
            )}

            <div className="bf-alert bf-alert--info">
              Re-running analysis may change which glyphs are extracted and may
              alter default variants. Review glyphs for this job after the
              analysis completes.
            </div>

            <div className="bf-panel__actions">
              <button
                type="button"
                className="bf-button"
                onClick={handleRetry}
                disabled={isAnalysing}
              >
                {isAnalysing ? 'Re-analysing…' : 'Re-analyse now'}
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
};

export default PageAnalysisRetryPage;

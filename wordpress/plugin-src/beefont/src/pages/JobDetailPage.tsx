'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useJobDetail from '@hooks/useJobDetail';
import usePages from '@hooks/usePages';
import useFontBuild from '@hooks/useFontBuild';
import { useJobRename } from '@hooks/useJobRename';

import LanguageStatusList from '@components/LanguageStatusList';
import PagesTable from '@components/PagesTable';
import FontBuildsPanel from '@components/FontBuildsPanel';
import { useApp } from '@context/AppContext';

import { friendlyMessage, type AppError } from '@bee/common/error';

const JobDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeJob, activeGlyphFormat } = useApp();

  const effectiveSid = useMemo(
    () => activeJob?.sid || '',
    [activeJob],
  );

  const sid = searchParams.get('sid') ?? effectiveSid;

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

  // NEW: rename hook
  const {
    rename,
    isRenaming,
    error: renameError,
  } = useJobRename(sid);

  // Local editable copies of name + base_family
  const [editName, setEditName] = useState<string>('');
  const [editBaseFamily, setEditBaseFamily] = useState<string>('');

  // Sync local state when job changes
  useEffect(() => {
    if (!job) return;
    setEditName(job.name || '');
    setEditBaseFamily(job.base_family || '');
  }, [job?.sid, job?.name, job?.base_family]);

  const isLoading = isJobLoading || isPagesLoading;
  const combinedError = jobError ?? pagesError ?? buildError ?? renameError ?? null;

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

  const handleRenameJob = async () => {
    if (!job) return;

    const nameTrimmed = editName.trim();
    const baseTrimmed = editBaseFamily.trim();

    // Prevent completely empty name
    if (!nameTrimmed) {
      window.alert('Job name cannot be empty.');
      return;
    }

    const hasNameChanged = nameTrimmed !== job.name;
    const hasBaseChanged = baseTrimmed !== (job.base_family || '');

    if (!hasNameChanged && !hasBaseChanged) {
      window.alert('Nothing to rename: name and base family are unchanged.');
      return;
    }

    const ok = window.confirm(
      [
        'Renaming this font job or its base family will delete all existing font builds for this job.',
        '',
        'All generated TTF files will be removed, and you will need to rebuild the fonts afterwards.',
        '',
        'Do you want to continue?',
      ].join('\n'),
    );
    if (!ok) return;

    try {
      await rename(nameTrimmed, baseTrimmed);
      await reload();
    } catch (err) {
      console.error('[JobDetailPage] rename failed:', err);
    }
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

      {(isLoading || isBuilding || isRenaming) && (
        <div className="bf-loading">
          {isLoading ? 'Loading job… ' : ''}
          {isBuilding ? 'Building font… ' : ''}
          {isRenaming ? 'Renaming job…' : ''}
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
              {activeGlyphFormat === 'png' && (
                <div className="bf-definition-list__row">
                  <dt>Pages</dt>
                  <dd>{job.page_count}</dd>
                </div>
              )}
              <div className="bf-definition-list__row">
                <dt>Glyphs</dt>
                <dd>{job.glyph_count}</dd>
              </div>
            </dl>
          </section>

          {/* NEW: rename section */}
          <section className="bf-panel bf-panel--rename">
            <h2>Rename font job</h2>
            <p className="bf-panel__hint">
              Changing the job name or base family will delete all font builds for this job. You will have to rebuild the fonts afterwards.
            </p>

            <div className="bf-form bf-form--stacked">
              <div className="bf-form__row">
                <label htmlFor="bf-job-name">Job name</label>
                <input
                  id="bf-job-name"
                  type="text"
                  className="bf-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div className="bf-form__row">
                <label htmlFor="bf-job-base-family">Base family</label>
                <input
                  id="bf-job-base-family"
                  type="text"
                  className="bf-input"
                  value={editBaseFamily}
                  onChange={e => setEditBaseFamily(e.target.value)}
                  placeholder="e.g. BeeHand_DE"
                />
              </div>

              <div className="bf-form__actions">
                <button
                  type="button"
                  className="bf-button"
                  onClick={handleRenameJob}
                  disabled={isRenaming}
                >
                  Rename job / base family
                </button>
              </div>
            </div>
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
          {activeGlyphFormat === 'png' && (
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
          )}

          {/* Job-level actions */}
          <section className="bf-panel bf-panel--actions">
            <h2>Job actions</h2>
            <div className="bf-panel__actions">
              {activeGlyphFormat === 'png' ? (
                <button
                  type="button"
                  className="bf-button"
                  onClick={handleOpenPrintUpload}
                >
                  Add pages for a language
                </button>
              ) : null}

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

// src/pages/MissingCharactersPage.tsx
'use client';

import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import useMissingCharacters from '@hooks/useMissingCharacters';
import AlphabetGrid, { type AlphabetCell } from '@components/AlphabetGrid';

import { friendlyMessage, type AppError } from '@bee/common/error';

const MissingCharactersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sid = searchParams.get('sid') ?? '';
  const language = searchParams.get('language') ?? '';

  const {
    status,
    isLoading,
    isRefreshing,
    error,
    fetchStatus,
  } = useMissingCharacters(sid || '', language || '', {
    manual: false,
  });

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  if (!sid || !language) {
    return (
      <section className="bf-page bf-page--missing-characters">
        <header className="bf-page__header">
          <h1>BeeFont – Missing characters</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job and/or language specified. Open this screen from the job detail
          page.
        </div>
      </section>
    );
  }

  const missingCells: AlphabetCell[] = useMemo(() => {
    if (!status || !status.missing_chars) return [];
    const chars = Array.from(status.missing_chars);
    return chars.map(ch => ({
      char: ch,
      isCovered: false,
    }));
  }, [status]);

  const handlePlanPages = () => {
    // Go back to template + alphabet planning, pre-selecting the language.
    navigate(
      `/printupload?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(language)}`,
    );
  };

  return (
    <section className="bf-page bf-page--missing-characters">
      <header className="bf-page__header">
        <h1>BeeFont – Missing characters</h1>
        <p className="bf-page__subtitle">
          Inspect which characters are still missing for this language and plan
          new pages.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      <section className="bf-panel">
        <div className="bf-panel__header">
          <h2>Status</h2>
          {(isLoading || isRefreshing) && (
            <span className="bf-panel__status">
              {isLoading ? 'Loading… ' : ''}
              {isRefreshing ? 'Refreshing…' : ''}
            </span>
          )}
        </div>

        {status && (
          <dl className="bf-definition-list">
            <div className="bf-definition-list__row">
              <dt>Language</dt>
              <dd>{status.language}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Ready</dt>
              <dd>{status.ready ? 'yes' : 'no'}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Required characters</dt>
              <dd>{status.required_chars}</dd>
            </div>
            <div className="bf-definition-list__row">
              <dt>Missing count</dt>
              <dd>{status.missing_count}</dd>
            </div>
          </dl>
        )}

        {!status && !isLoading && !error && (
          <p>No status available for this job/language.</p>
        )}

        <div className="bf-panel__actions">
          <button
            type="button"
            className="bf-button bf-button--small"
            onClick={() => {
              fetchStatus().catch(err => {
                console.error(
                  '[MissingCharactersPage] fetchStatus failed:',
                  err,
                );
              });
            }}
            disabled={isLoading || isRefreshing}
          >
            Refresh status
          </button>
        </div>
      </section>

      <section className="bf-panel">
        <h2>Missing characters</h2>

        {isLoading && missingCells.length === 0 && (
          <div className="bf-loading">
            Loading missing characters…
          </div>
        )}

        {!isLoading && missingCells.length === 0 && status && status.ready && (
          <p>This language is complete. No characters are missing.</p>
        )}

        {!isLoading &&
          missingCells.length === 0 &&
          status &&
          !status.ready &&
          !status.missing_chars && (
            <p>
              Language is not ready, but the backend did not provide a list of
              missing characters.
            </p>
          )}

        {missingCells.length > 0 && (
          <AlphabetGrid
            title="Missing characters"
            items={missingCells}
          />
        )}

        <div className="bf-panel__actions">
          <button
            type="button"
            className="bf-button"
            onClick={handlePlanPages}
            disabled={missingCells.length === 0}
          >
            Create pages for missing characters
          </button>
        </div>
      </section>
    </section>
  );
};

export default MissingCharactersPage;

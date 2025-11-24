// src/pages/JobOverviewPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

import useJobs from '@hooks/useJobs';
import { friendlyMessage, type AppError } from '@bee/common/error';
import { useApp } from '@context/AppContext';
import type { FontJob } from '@mytypes/fontJob';

const JobOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, isLoading, isDeleting, error, deleteJob, createJob } = useJobs();
  const { setActiveJob } = useApp();

  const [isCreating, setIsCreating] = useState(false);

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  const handleCreateJob = async () => {
    const name = window.prompt('Job name', 'My BeeFont');
    if (!name || !name.trim()) return;

    setIsCreating(true);
    try {
      const job = await createJob({ name: name.trim() });

      // global aktiven Job setzen
      setActiveJob(job);

      // direkt ins Detail springen
      navigate(`/jobdetail?sid=${encodeURIComponent(job.sid)}`);
    } catch (e) {
      console.error('[JobOverviewPage] create job failed:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenJob = (job: FontJob) => {
    setActiveJob(job);
    navigate(`/jobdetail?sid=${encodeURIComponent(job.sid)}`);
  };

  const handleOpenBuilds = (job: FontJob) => {
    setActiveJob(job);
    navigate(`/fontbuild?sid=${encodeURIComponent(job.sid)}`);
  };

  const handleDeleteJob = async (job: FontJob) => {
    const ok = window.confirm(
      `Do you really want to delete the job "${job.name}"? This cannot be undone.`,
    );
    if (!ok) return;

    await deleteJob(job.sid).catch(err => {
      console.error('[JobOverviewPage] deleteJob failed:', err);
    });
  };

  return (
    <section className="bf-page bf-page--job-overview">
      <header className="bf-page__header">
        <h1>BeeFont – Jobs</h1>
        <p className="bf-page__subtitle">
          Your font projects. Open a job to manage pages, glyphs, and builds.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {isLoading && (
        <div className="bf-loading">
          Loading jobs…
        </div>
      )}

      {!isLoading && !error && (
        <div className="bf-page__toolbar mb-3">
          <Button
            variant="primary"
            className="mt-2"
            onClick={handleCreateJob}
            disabled={isCreating}
          >
            {isCreating ? 'Creating…' : 'New job'}
          </Button>
        </div>
      )}

      {!isLoading && jobs.length === 0 && !error && (
        <div className="bf-empty-state">
          <p>No jobs yet.</p>
        </div>
      )}

      {!isLoading && jobs.length > 0 && (
        <div className="bf-job-list">
          {jobs.map(job => (
            <article key={job.sid} className="bf-job-card">
              <header className="bf-job-card__header">
                <h2 className="bf-job-card__title">{job.name}</h2>
                <div className="bf-job-card__meta">
                  <span>
                    Created:{' '}
                    {job.created_at
                      ? new Date(job.created_at).toLocaleString()
                      : 'n/a'}
                  </span>
                  {job.base_family && (
                    <span>Base family: {job.base_family}</span>
                  )}
                </div>
              </header>

              <div className="bf-job-card__stats">
                <span>
                  Pages: <strong>{job.page_count}</strong>
                </span>
                <span>
                  Glyphs: <strong>{job.glyph_count}</strong>
                </span>
              </div>

              <div className="bf-job-card__actions">
                <button
                  type="button"
                  className="bf-button"
                  onClick={() => handleOpenJob(job)}
                >
                  Open job
                </button>

                <button
                  type="button"
                  className="bf-button"
                  onClick={() => handleOpenBuilds(job)}
                >
                  Open builds / downloads
                </button>

                <button
                  type="button"
                  className="bf-button bf-button--danger"
                  disabled={isDeleting}
                  onClick={() => handleDeleteJob(job)}
                >
                  {isDeleting ? 'Deleting…' : 'Delete job'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default JobOverviewPage;

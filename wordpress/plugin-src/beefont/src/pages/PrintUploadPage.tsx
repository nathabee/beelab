// src/pages/PrintUploadPage.tsx
//
'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApp } from '@context/AppContext';
import usePages from '@hooks/usePages';

import { friendlyMessage, type AppError } from '@bee/common/error';

import type { JobPage } from '@mytypes/jobPage';

const PrintUploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const sid = searchParams.get('sid') ?? '';
  const language = searchParams.get('language') ?? '';
  const templateCodeFromUrl = searchParams.get('template') ?? '';

  const { templates, languages } = useApp();

  const {
    uploadPage,
    isUploading,
    error: pagesError,
  } = usePages(sid, { manual: true });

  const [letters, setLetters] = useState<string>('');
  const [pageIndexInput, setPageIndexInput] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [autoAnalyse, setAutoAnalyse] = useState<boolean>(true);
  const [lastCreatedPage, setLastCreatedPage] = useState<JobPage | null>(null);

  const [localError, setLocalError] = useState<string | null>(null);

  const errorText = useMemo(() => {
    if (localError) return localError;
    if (pagesError) return friendlyMessage(pagesError as AppError);
    return null;
  }, [localError, pagesError]);

  if (!sid) {
    return (
      <section className="bf-page bf-page--print-upload">
        <header className="bf-page__header">
          <h1>BeeFont – Print and upload</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen.
        </div>
      </section>
    );
  }

  const hasBootstrapData = Boolean(templates && languages);

  const selectedTemplate = useMemo(
    () =>
      templates?.find(t => t.code === templateCodeFromUrl) ?? null,
    [templates, templateCodeFromUrl],
  );

  const selectedLanguage = useMemo(
    () =>
      languages?.find(l => l.code === language) ?? null,
    [languages, language],
  );

  const templateImageUrl = useMemo(() => {
    if (!templateCodeFromUrl) return null;
    const encoded = encodeURIComponent(templateCodeFromUrl);
    return `/templates/${encoded}/image/`;
  }, [templateCodeFromUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setFile(null);
      return;
    }
    setFile(files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLastCreatedPage(null);

    if (!templateCodeFromUrl) {
      setLocalError('Please select a template (via Template + Alphabet page) before uploading.');
      return;
    }

    if (!letters.trim()) {
      setLocalError('Please enter the letters for this page in the correct order.');
      return;
    }

    if (!file) {
      setLocalError('Please select a scan file to upload.');
      return;
    }

    let pageIndex: number | undefined | null = undefined;
    if (pageIndexInput.trim()) {
      const parsed = Number(pageIndexInput.trim());
      if (Number.isNaN(parsed)) {
        setLocalError('Page index must be a number if provided.');
        return;
      }
      pageIndex = parsed;
    }

    try {
      const created = await uploadPage({
        template_code: templateCodeFromUrl,
        letters: letters.trim(),
        page_index: pageIndex,
        file,
        auto_analyse: autoAnalyse,
      });
      setLastCreatedPage(created);

      // Optionally reset some fields but keep template + language
      setLetters('');
      setPageIndexInput('');
      setFile(null);
    } catch (err) {
      // Error already normalized in hook; localError is set via pagesError
      console.error('[PrintUploadPage] uploadPage failed:', err);
    }
  };

  return (
    <section className="bf-page bf-page--print-upload">
      <header className="bf-page__header">
        <h1>BeeFont – Print and upload</h1>
        <p className="bf-page__subtitle">
          Print a template, draw your letters, scan the page and upload it for analysis.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      {!hasBootstrapData && (
        <div className="bf-alert bf-alert--warning">
          Templates and languages are not loaded yet. Make sure the plugin
          bootstrap (via login) has completed.
        </div>
      )}

      {hasBootstrapData && (
        <>
          {/* Context info: language + template */}
          <section className="bf-panel">
            <h2>Context</h2>
            <dl className="bf-definition-list">
              <div className="bf-definition-list__row">
                <dt>Job SID</dt>
                <dd>{sid}</dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Language</dt>
                <dd>
                  {selectedLanguage
                    ? `${selectedLanguage.name} (${selectedLanguage.code})`
                    : language || 'not set'}
                </dd>
              </div>
              <div className="bf-definition-list__row">
                <dt>Template</dt>
                <dd>
                  {selectedTemplate
                    ? `${selectedTemplate.description || selectedTemplate.code} (${selectedTemplate.capacity} cells)`
                    : templateCodeFromUrl || 'not set'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Print section */}
          <section className="bf-panel">
            <h2>1. Print template</h2>
            {templateImageUrl ? (
              <>
                <p>
                  Use this template to print an empty page. The letters you enter later must
                  follow the cell order of this template.
                </p>
                <a
                  href={templateImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bf-link bf-link--download"
                >
                  Open template image in new tab
                </a>
              </>
            ) : (
              <p>
                No template selected. Go back to the Template + Alphabet screen to choose a
                template and language, then return here.
              </p>
            )}
          </section>

          {/* Upload section */}
          <section className="bf-panel">
            <h2>2. Upload filled scan</h2>

            <form onSubmit={handleSubmit} className="bf-form bf-form--upload">
              <div className="bf-form__row">
                <label htmlFor="letters">
                  Letters on this page
                </label>
                <input
                  id="letters"
                  type="text"
                  value={letters}
                  onChange={e => setLetters(e.target.value)}
                  placeholder="Example: ABCDE..."
                  className="bf-input"
                />
                <small className="bf-form__help">
                  Enter the letters exactly in the order they appear on the template
                  (row by row).
                </small>
              </div>

              <div className="bf-form__row">
                <label htmlFor="page-index">
                  Page index (optional)
                </label>
                <input
                  id="page-index"
                  type="number"
                  value={pageIndexInput}
                  onChange={e => setPageIndexInput(e.target.value)}
                  placeholder="Leave empty for auto-assigned index"
                  className="bf-input"
                />
              </div>

              <div className="bf-form__row">
                <label htmlFor="scan-file">
                  Scan file
                </label>
                <input
                  id="scan-file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="bf-input"
                />
              </div>

              <div className="bf-form__row bf-form__row--inline">
                <label htmlFor="auto-analyse">
                  <input
                    id="auto-analyse"
                    type="checkbox"
                    checked={autoAnalyse}
                    onChange={e => setAutoAnalyse(e.target.checked)}
                  />
                  Auto-analyse after upload
                </label>
              </div>

              <div className="bf-form__actions">
                <button
                  type="submit"
                  className="bf-button"
                  disabled={
                    isUploading ||
                    !templateCodeFromUrl ||
                    !letters.trim() ||
                    !file
                  }
                >
                  {isUploading ? 'Uploading…' : 'Upload and analyse'}
                </button>
              </div>
            </form>

            {lastCreatedPage && (
              <div className="bf-alert bf-alert--success">
                <p>Page uploaded successfully.</p>
                <p>
                  Page ID: <strong>{lastCreatedPage.id}</strong>, index:{' '}
                  <strong>
                    {lastCreatedPage.page_index ?? '(none)'}
                  </strong>
                  , letters:{' '}
                  <strong>{lastCreatedPage.letters}</strong>
                </p>
                <p>
                  You can review this page in the Job detail screen and re-run analysis there if needed.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

export default PrintUploadPage;

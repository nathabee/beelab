// src/pages/PrintUploadPage.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApp } from '@context/AppContext';
import usePages from '@hooks/usePages';
import useGlyphs from '@hooks/useGlyphs';
import useTemplateAlphabet from '@hooks/useTemplateAlphabet';
import useTemplateImage from '@hooks/useTemplateImage';

import AlphabetGrid, { type AlphabetCell } from '@components/AlphabetGrid';

import { friendlyMessage, type AppError } from '@bee/common/error';

import type { JobPage } from '@mytypes/jobPage';

const PrintUploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const sidParam = searchParams.get('sid') ?? '';
  const languageFromUrl = searchParams.get('language') ?? '';
  const templateCodeFromUrl = searchParams.get('template') ?? '';

  const { templates, languages, activeJob } = useApp();

  const effectiveSid = useMemo(
    () => sidParam || activeJob?.sid || '',
    [sidParam, activeJob],
  );

  const [selectedLanguage, setSelectedLanguage] = useState<string>(languageFromUrl || '');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templateCodeFromUrl || '');
  const [letters, setLetters] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);
  const [autoAnalyse, setAutoAnalyse] = useState<boolean>(true);
  const [lastCreatedPage, setLastCreatedPage] = useState<JobPage | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    uploadPage,
    isUploading,
    error: pagesError,
  } = usePages(effectiveSid || '', { manual: true });

  const { glyphs } = useGlyphs(effectiveSid || '', { manual: false });

  const {
    alphabet,
    isLoading: isLoadingAlphabet,
    error: alphabetError,
  } = useTemplateAlphabet(selectedLanguage);

  const {
    isLoading: isLoadingTemplateImage,
    error: templateImageError,
    openInNewTab: openTemplateImageInNewTab,
  } = useTemplateImage();

  const errorText = useMemo(() => {
    if (localError) return localError;
    if (pagesError) return friendlyMessage(pagesError as AppError);
    if (alphabetError) return friendlyMessage(alphabetError as AppError);
    if (templateImageError) return friendlyMessage(templateImageError as AppError);
    return null;
  }, [localError, pagesError, alphabetError, templateImageError]);

  useEffect(() => {
    if (!selectedLanguage && languages && languages.length > 0) {
      setSelectedLanguage(languages[0].code);
    }
  }, [selectedLanguage, languages]);

  useEffect(() => {
    if (!selectedTemplate && templates && templates.length > 0) {
      setSelectedTemplate(templates[0].code);
    }
  }, [selectedTemplate, templates]);

  if (!effectiveSid) {
    return (
      <section className="bf-page bf-page--print-upload">
        <header className="bf-page__header">
          <h1>BeeFont – Print and upload</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen or select a job first.
        </div>
      </section>
    );
  }

  const hasBootstrapData = Boolean(templates && languages);

  const selectedLanguageObj = useMemo(
    () => languages?.find(l => l.code === selectedLanguage) ?? null,
    [languages, selectedLanguage],
  );

  const selectedTemplateObj = useMemo(
    () => templates?.find(t => t.code === selectedTemplate) ?? null,
    [templates, selectedTemplate],
  );

  const defaultCoveredLetters = useMemo(() => {
    const set = new Set<string>();
    glyphs
      ?.filter(g => g.is_default)
      .forEach(g => set.add(g.letter));
    return set;
  }, [glyphs]);

  const alphabetItems: AlphabetCell[] = useMemo(() => {
    if (!alphabet) return [];
    const chars = Array.from(alphabet);
    return chars.map(ch => ({
      char: ch,
      isCovered: defaultCoveredLetters.has(ch),
    }));
  }, [alphabet, defaultCoveredLetters]);

    const uploadDisabled =
    isUploading ||
    !selectedTemplate ||
    !selectedLanguage ||
    !letters.trim() ||
    !file;

  const uploadDisabledReason = useMemo(() => {
    if (isUploading) return 'Upload in progress…';

    if (!selectedLanguage) return 'Please select a language.';
    if (!selectedTemplate) return 'Please select a template.';
    if (!letters.trim()) return 'Please enter the letters for this page in the context section.';
    if (!file) return 'Please select a scan file to upload.';

    return null;
  }, [isUploading, selectedLanguage, selectedTemplate, letters, file]);

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

    if (!selectedTemplate) {
      setLocalError('Please select a template before uploading.');
      return;
    }

    if (!selectedLanguage) {
      setLocalError('Please select a language before uploading.');
      return;
    }

    if (!letters.trim()) {
      setLocalError('Please enter the letters for this page in the context section.');
      return;
    }

    if (!file) {
      setLocalError('Please select a scan file to upload.');
      return;
    }

    try {
      const created = await uploadPage({
        template_code: selectedTemplate,
        letters: letters.trim(),
        file,
        auto_analyse: autoAnalyse,
      });

      setLastCreatedPage(created);
      setFile(null);
    } catch (err) {
      console.error('[PrintUploadPage] uploadPage failed:', err);
    }
  };

  return (
    <section className="bf-page bf-page--print-upload">
      <header className="bf-page__header">
        <h1>BeeFont – Print and upload</h1>
        <p className="bf-page__subtitle">
          Select language and template, print the sheet, draw your letters, then scan and upload.
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
          {/* 1. Context */}
          <section className="bf-panel">
            <h2>Context</h2>
            <dl className="bf-definition-list">
              <div className="bf-definition-list__row">
                <dt>Job SID</dt>
                <dd>{effectiveSid}</dd>
              </div>

              <div className="bf-definition-list__row">
                <dt>Language</dt>
                <dd>
                  <select
                    className="bf-input"
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                  >
                    <option value="">-- select language --</option>
                    {languages?.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                  {selectedLanguageObj && (
                    <small className="bf-form__help">
                      Alphabet length: {alphabet ? alphabet.length : 'unknown'}
                    </small>
                  )}
                </dd>
              </div>

              <div className="bf-definition-list__row">
                <dt>Template</dt>
                <dd>
                  <select
                    className="bf-input"
                    value={selectedTemplate}
                    onChange={e => setSelectedTemplate(e.target.value)}
                  >
                    <option value="">-- select template --</option>
                    {templates?.map(t => (
                      <option key={t.code} value={t.code}>
                        {t.description || t.code} ({t.capacity} cells)
                      </option>
                    ))}
                  </select>
                  {selectedTemplateObj && (
                    <small className="bf-form__help">
                      {selectedTemplateObj.page_format} · {selectedTemplateObj.rows}×{selectedTemplateObj.cols}{' '}
                      ({selectedTemplateObj.capacity} cells)
                    </small>
                  )}
                </dd>
              </div>

              <div className="bf-definition-list__row">
                <dt>Letters on this page</dt>
                <dd>
                  <input
                    id="letters"
                    type="text"
                    value={letters}
                    onChange={e => setLetters(e.target.value)}
                    placeholder="Example: ABCDE..."
                    className="bf-input"
                  />
                  <small className="bf-form__help">
                    Enter the letters exactly in the order they appear on the template (row by row).
                  </small>
                </dd>
              </div>
            </dl>
          </section>

          {/* 2. Alphabet overview */}
          <section className="bf-panel">
            <h2>Alphabet for selected language</h2>

            {!selectedLanguage && (
              <p>Please select a language to see its alphabet.</p>
            )}

            {selectedLanguage && isLoadingAlphabet && (
              <p>Loading alphabet…</p>
            )}

            {selectedLanguage && !isLoadingAlphabet && !alphabetError && (
              <>
                {alphabetItems.length === 0 ? (
                  <p>No alphabet data available for this language.</p>
                ) : (
                  <AlphabetGrid
                    items={alphabetItems}
                    title="Characters and coverage"
                  />
                )}
              </>
            )}
          </section>

          {/* 3. Template printing */}
          <section className="bf-panel">
            <h2>Print template</h2>

            {!selectedTemplate && (
              <p>Please select a template above to enable printing links.</p>
            )}

            {selectedTemplate && (
              <>
                <p>
                  Use the empty template to print a blank page. Use the prefilled template to see your letters
                  rendered in the grid for this page.
                </p>

                <ul className="bf-link-list">
                  <li>
                    <a
                      href="#"
                      className="bf-link bf-link--download"
                      onClick={e => {
                        e.preventDefault();
                        void openTemplateImageInNewTab({
                          code: selectedTemplate,
                          mode: 'blankpure',
                        });
                      }}
                    >
                      Download empty template
                    </a>
                  </li>

                  <li>
                    {letters.trim() ? (
                      <a
                        href="#"
                        className="bf-link"
                        onClick={e => {
                          e.preventDefault();
                          void openTemplateImageInNewTab({
                            code: selectedTemplate,
                            mode: 'prefill',
                            letters: letters.trim(),
                          });
                        }}
                      >
                        Show prefilled template
                      </a>
                    ) : (
                      <span className="bf-text-muted">
                        Enter letters in the context section to enable the prefilled template.
                      </span>
                    )}
                  </li>
                </ul>

                {isLoadingTemplateImage && (
                  <p className="bf-text-muted">Generating template image…</p>
                )}
              </>
            )}
          </section>

          {/* 4. Upload scan */}
          <section className="bf-panel">
            <h2>Upload filled scan</h2>

            <form onSubmit={handleSubmit} className="bf-form bf-form--upload">
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
                  disabled={uploadDisabled}
                >
                  {isUploading ? 'Uploading…' : 'Upload and analyse'}
                </button>

                {uploadDisabled && uploadDisabledReason && (
                  <p className="bf-form__help bf-form__help--error">
                    {uploadDisabledReason}
                  </p>
                )}
              </div>

            </form>

            {lastCreatedPage && (
              <div className="bf-alert bf-alert--success">
                <p>Page uploaded successfully.</p>
                <p>
                  Page ID: <strong>{lastCreatedPage.id}</strong>, index:{' '}
                  <strong>{lastCreatedPage.page_index ?? '(auto)'}</strong>, letters:{' '}
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

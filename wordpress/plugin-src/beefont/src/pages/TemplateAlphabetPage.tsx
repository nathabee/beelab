// src/pages/TemplateAlphabetPage.tsx
//

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { useApp } from '@context/AppContext';
import { useUser } from '@bee/common';

import { apiApp, authHeaders } from '@utils/api';
import useGlyphs from '@hooks/useGlyphs';

import AlphabetGrid, { type AlphabetCell } from '@components/AlphabetGrid';

import {
  toAppError,
  friendlyMessage,
  errorBus,
  type AppError,
} from '@bee/common/error';

import type { SupportedLanguageAlphabet } from '@mytypes/language';

const TemplateAlphabetPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const sid = searchParams.get('sid') ?? '';
  const initialLanguage = searchParams.get('language') ?? '';
  const initialTemplate = searchParams.get('template') ?? '';

  const { templates, languages } = useApp();
  const { token } = useUser();

  // Glyphs of this job – used to mark which letters are already covered
  const { glyphs } = useGlyphs(sid || '', { manual: false });

  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    initialLanguage,
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    initialTemplate,
  );

  const [alphabetItems, setAlphabetItems] = useState<AlphabetCell[]>([]);
  const [isLoadingAlphabet, setIsLoadingAlphabet] = useState<boolean>(false);
  const [alphabetError, setAlphabetError] = useState<AppError | null>(null);

  // Global error text for this page
  const errorText = useMemo(
    () => (alphabetError ? friendlyMessage(alphabetError) : null),
    [alphabetError],
  );

  // If there is no sid, the page cannot work meaningfully.
  if (!sid) {
    return (
      <section className="bf-page bf-page--template-alphabet">
        <header className="bf-page__header">
          <h1>BeeFont – Template and alphabet setup</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from the job detail screen.
        </div>
      </section>
    );
  }

  const defaultCoveredLetters = useMemo(() => {
    const set = new Set<string>();
    glyphs
      .filter(g => g.is_default)
      .forEach(g => set.add(g.letter));
    return set;
  }, [glyphs]);

  // Fetch alphabet whenever language or glyph coverage changes
  useEffect(() => {
    if (!selectedLanguage) {
      setAlphabetItems([]);
      setAlphabetError(null);
      return;
    }

    if (!token) {
      const err = toAppError(new Error('No auth token'), {
        component: 'TemplateAlphabetPage',
        functionName: 'fetchAlphabet',
        service: 'beefont',
      });
      err.severity = 'page';
      errorBus.emit(err);
      setAlphabetError(err);
      setAlphabetItems([]);
      return;
    }

    setIsLoadingAlphabet(true);
    setAlphabetError(null);

    const headers = authHeaders(token);
    const encoded = encodeURIComponent(selectedLanguage);
    const url = `/languages/${encoded}/alphabet/`;

    apiApp
      .get<SupportedLanguageAlphabet>(url, { headers })
      .then(res => {
        const alphaStr = res.data.alphabet || '';
        const chars = Array.from(alphaStr);
        const items: AlphabetCell[] = chars.map(ch => ({
          char: ch,
          isCovered: defaultCoveredLetters.has(ch),
        }));
        setAlphabetItems(items);
      })
      .catch(e => {
        const appErr: AppError = toAppError(e, {
          component: 'TemplateAlphabetPage',
          functionName: 'fetchAlphabet',
          service: 'beefont',
        });
        if (appErr.httpStatus === 401 || appErr.httpStatus === 403) {
          appErr.severity = 'page';
          errorBus.emit(appErr);
        }
        setAlphabetError(appErr);
        setAlphabetItems([]);
      })
      .finally(() => {
        setIsLoadingAlphabet(false);
      });
  }, [selectedLanguage, token, defaultCoveredLetters]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLanguage(value);

    const next = new URLSearchParams(searchParams);
    if (value) next.set('language', value);
    else next.delete('language');
    setSearchParams(next);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedTemplate(value);

    const next = new URLSearchParams(searchParams);
    if (value) next.set('template', value);
    else next.delete('template');
    setSearchParams(next);
  };

  const handleCreatePlannedPages = () => {
    if (!selectedLanguage || !selectedTemplate) {
      window.alert(
        'Please select both a language and a template before creating planned pages.',
      );
      return;
    }

    // For now, just navigate to the print/upload screen with current selections.
    // The actual batching logic (splitting alphabet into template-sized chunks)
    // can be implemented later in PrintUploadPage or a dedicated hook.
    navigate(
      `/printupload?sid=${encodeURIComponent(
        sid,
      )}&language=${encodeURIComponent(
        selectedLanguage,
      )}&template=${encodeURIComponent(selectedTemplate)}`,
    );
  };

  const hasBootstrapData = Boolean(templates && languages);

  return (
    <section className="bf-page bf-page--template-alphabet">
      <header className="bf-page__header">
        <h1>BeeFont – Template and alphabet setup</h1>
        <p className="bf-page__subtitle">
          Plan new pages for a job by combining templates and alphabets.
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
          {/* Language selection */}
          <section className="bf-panel">
            <h2>Language</h2>
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="bf-select"
            >
              <option value="">Select language…</option>
              {languages!.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </section>

          {/* Template selection */}
          <section className="bf-panel">
            <h2>Template</h2>
            <select
              value={selectedTemplate}
              onChange={handleTemplateChange}
              className="bf-select"
            >
              <option value="">Select template…</option>
              {templates!.map(tpl => (
                <option key={tpl.code} value={tpl.code}>
                  {tpl.description || tpl.code} ({tpl.capacity} cells)
                </option>
              ))}
            </select>
          </section>

          {/* Alphabet coverage */}
          <section className="bf-panel">
            <h2>Alphabet coverage</h2>

            {isLoadingAlphabet && (
              <div className="bf-loading">
                Loading alphabet…
              </div>
            )}

            {!isLoadingAlphabet && alphabetItems.length === 0 && (
              <p>No alphabet loaded yet.</p>
            )}

            {!isLoadingAlphabet && alphabetItems.length > 0 && (
              <AlphabetGrid
                title="Characters for this language"
                items={alphabetItems}
              />
            )}

            <div className="bf-panel__actions">
              <button
                type="button"
                className="bf-button"
                onClick={handleCreatePlannedPages}
                disabled={!selectedLanguage || !selectedTemplate}
              >
                Create planned pages from alphabet
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
};

export default TemplateAlphabetPage;

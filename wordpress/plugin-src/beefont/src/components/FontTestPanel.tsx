// src/components/FontTestPanel.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { DEFAULT_FONT_TEST_TEXT } from '@mytypes/fontTest';

export type FontTestPanelProps = {
  fontUrl: string;
  languageCode?: string | null;
  jobName?: string | null;
  onClose?: () => void;
};

const FontTestPanel: React.FC<FontTestPanelProps> = ({
  fontUrl,
  languageCode,
  jobName,
  onClose,
}) => {
  const [text, setText] = useState<string>(DEFAULT_FONT_TEST_TEXT);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stable font-family name per job + language
  const fontFamilyName = useMemo(
    () =>
      [
        'BeeFontPreview',
        jobName ? jobName.replace(/\s+/g, '-') : null,
        languageCode ?? null,
      ]
        .filter(Boolean)
        .join('-'),
    [jobName, languageCode],
  );

  useEffect(() => {
    if (!fontUrl || !fontFamilyName) return;

    let cancelled = false;
    let fontFace: FontFace | null = null;

    setIsLoaded(false);
    setLoadError(null);

    (async () => {
      try {
        // Important: credentials: 'include' so session cookies get sent
        const res = await fetch(fontUrl, { credentials: 'include' });
        if (!res.ok) {
          console.warn(
            '[FontTestPanel] font fetch failed',
            res.status,
            res.statusText,
          );
          if (!cancelled) {
            setLoadError(`Font HTTP error ${res.status}`);
          }
          return;
        }

        const data = await res.arrayBuffer();
        if (cancelled) return;

        // Register font from raw binary
        fontFace = new FontFace(fontFamilyName, data);
        await fontFace.load();
        if (cancelled) return;

        (document as any).fonts.add(fontFace);
        setIsLoaded(true);
      } catch (err) {
        console.error('[FontTestPanel] failed to load font:', err);
        if (!cancelled) {
          setLoadError('Failed to load font (see console).');
        }
      }
    })();

    // Cleanup: remove font face on unmount/change
    return () => {
      cancelled = true;
      if (fontFace) {
        try {
          (document as any).fonts.delete(fontFace);
        } catch {
          // ignore
        }
      }
    };
  }, [fontUrl, fontFamilyName]);

  return (
    <section className="bf-panel bf-panel--font-test">
      <div className="bf-panel__header">
        <h2>Test this font</h2>
        <div className="bf-panel__status">
          {jobName && <span>Job: {jobName} · </span>}
          {languageCode && <span>Language: {languageCode}</span>}
        </div>
        {onClose && (
          <div className="bf-panel__actions">
            <button
              type="button"
              className="bf-button bf-button--small bf-button--ghost"
              onClick={onClose}
            >
              Close preview
            </button>
          </div>
        )}
      </div>

      <p className="bf-helptext">
        Edit the text below and see it rendered with the built font. This does
        not modify the font – it is just a live preview in your browser.
      </p>

      {loadError && (
        <div className="bf-alert bf-alert--warning">
          {loadError} – falling back to system font.
        </div>
      )}

      {!loadError && !isLoaded && (
        <div className="bf-loading">Loading font…</div>
      )}

      <div className="bf-font-test__layout">
        <div className="bf-font-test__editor">
          <label className="bf-glyph-editor__label">
            Sample text
            <textarea
              className="bf-input bf-input--textarea"
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </label>
        </div>

        <div className="bf-font-test__preview-wrapper">
          <div
            className="bf-font-test__preview"
            style={{
              fontFamily: isLoaded
                ? `'${fontFamilyName}', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
                : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {text || 'Type something above to preview this font…'}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FontTestPanel;

'use client';

// src/components/LanguageStatusList.tsx

import React from 'react';
import type { LanguageStatus } from '@mytypes/languageStatus';

type LanguageStatusListProps = {
  items: LanguageStatus[];
  onBuildFont: (languageCode: string) => void;
  onBuildColorFont?: (languageCode: string) => void;
  onShowMissing: (languageCode: string) => void;
  getTtfUrl?: (languageCode: string) => string | null;  // optional
  onDownloadTtf: (languageCode: string) => void;
};

const LanguageStatusList: React.FC<LanguageStatusListProps> = ({
  items,
  onBuildFont,
  onBuildColorFont,
  onShowMissing,
  getTtfUrl,
  onDownloadTtf,
}) => {
  if (!items || items.length === 0) {
    return <p>No languages available.</p>;
  }

  return (
    <ul className="bf-language-list">
      {items.map(lang => {
        const isReady = lang.ready;
        const ttfUrl = getTtfUrl ? getTtfUrl(lang.language) : null;

        // If getTtfUrl is provided (FontBuildPage), only enable when URL exists.
        // If not provided (JobDetail), fall back to "ready".
        const canDownload = getTtfUrl ? !!ttfUrl : isReady;

        return (
          <li key={lang.language} className="bf-language-list__item">
            <div className="bf-language-list__info">
              <strong>{lang.language.toUpperCase()}</strong>{' '}
              {isReady ? '(ready)' : '(incomplete)'}
              {!isReady && (
                <span className="bf-language-list__missing-count">
                  {' '}
                  · Missing glyphs: {lang.missing_count}
                </span>
              )}
            </div>

            <div className="bf-language-list__actions">
              <button
                type="button"
                disabled={!isReady}
                onClick={() => onBuildFont(lang.language)}
              >
                Build font
              </button>
              {onBuildColorFont && (
                <button
                  type="button"
                  disabled={!isReady}
                  onClick={() => onBuildColorFont(lang.language)}
                >
                  Build color font
                </button>
              )}


              {!isReady && (
                <button
                  type="button"
                  onClick={() => onShowMissing(lang.language)}
                >
                  Show missing characters
                </button>
              )}

              <button
                type="button"
                className="bf-link bf-link--download"
                onClick={() => onDownloadTtf(lang.language)}
                disabled={!canDownload}
              >
                Download TTF
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default LanguageStatusList;

'use client';

// src/components/LanguageStatusList.tsx

import React from 'react';
import type { LanguageStatus } from '@mytypes/languageStatus';

export type LanguageStatusListProps = {
  items: LanguageStatus[];

  /**
   * Called when the user clicks "Build font" for a language.
   * You can wire this to useFontBuild.buildLanguage(language).
   */
  onBuildFont?: (languageCode: string) => void;

  /**
   * Called when the user clicks "Show missing characters".
   * Typically pushes router to MissingCharactersPage.
   */
  onShowMissing?: (languageCode: string) => void;

  /**
   * Optional: URL generator for TTF downloads to show a direct link.
   * If provided, a "Download TTF" link will be rendered.
   */
  getTtfUrl?: (languageCode: string) => string | null;
};

const LanguageStatusList: React.FC<LanguageStatusListProps> = ({
  items,
  onBuildFont,
  onShowMissing,
  getTtfUrl,
}) => {
  if (!items || items.length === 0) {
    return <p>No languages available.</p>;
  }

  return (
    <ul className="bf-language-list">
      {items.map(lang => {
        const isReady = lang.ready;
        const ttfUrl = getTtfUrl ? getTtfUrl(lang.language) : null;

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
              {onBuildFont && (
                <button
                  type="button"
                  disabled={!isReady}
                  onClick={() => onBuildFont(lang.language)}
                >
                  Build font
                </button>
              )}

              {!isReady && onShowMissing && (
                <button
                  type="button"
                  onClick={() => onShowMissing(lang.language)}
                >
                  Show missing characters
                </button>
              )}

              {ttfUrl && (
                <a
                  href={ttfUrl}
                  className="bf-link bf-link--download"
                >
                  Download TTF
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default LanguageStatusList;

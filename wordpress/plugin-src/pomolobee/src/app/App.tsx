import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import PomoloBeeHeader from '@app/PomoloBeeHeader';
import AppRoutes from '@app/router';
import { ErrorProvider, ErrorBanner, ErrorBoundary } from '@bee/common';

// robust fallback if WP failed to inject settings
function detectBasename() {
  const injected = (window as any)?.pomolobeeSettings?.basename;
  if (injected) return injected;
  const first = location.pathname.split('/').filter(Boolean)[0] || '';
  return first ? `/${first}` : '/';
}
function detectErrorPath() {
  return (window as any)?.pomolobeeSettings?.errorPath || '/error';
}

const App = () => {
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const s = document.createElement('script');
      s.id = 'google-translate-script';
      s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(s);
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', includedLanguages: 'fr,en', autoDisplay: false, default: 'fr' },
          'google_translate_element'
        );
      };
    }
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  const basename  = detectBasename();   // '/pomolobee'
  const errorPath = detectErrorPath();  // '/error'

  return (
    <div className="pomolobee-app-container">
      <BrowserRouter basename={basename}>
        <div className="translate-box" style={{ padding: 10, textAlign: 'right' }}>
          🌐 Translate : <span id="google_translate_element"></span>
        </div>

        <div className="app-layout">
          <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button className="hamburger-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <PomoloBeeHeader />
          </div>

          <div className="content-container">
            <ErrorProvider errorPath={errorPath}>
              <ErrorBanner />
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </ErrorProvider>
          </div>
        </div>
      </BrowserRouter>
    </div>
  );
};
export default App;

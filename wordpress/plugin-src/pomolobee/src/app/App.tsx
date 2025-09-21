// src/app/App.tsx
import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import PomoloBeeHeader from '@app/PomoloBeeHeader';
import AppRoutes from '@app/router';
import { ErrorProvider, ErrorBanner, ErrorBoundary, TranslateBox } from '@bee/common';

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
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const basename  = detectBasename();
  const errorPath = detectErrorPath();

  return (
    <div className="pomolobee-app-container">
      <BrowserRouter basename={basename}>
        {/* Shared translate widget */}
        <TranslateBox
          className="translate-box"
          style={{ padding: 10, textAlign: 'right' }}
          languages="fr,en"
          pageLanguage="en"
          // optional: give a deterministic id per plugin to avoid clashes
          containerId="pb_google_translate"
        />

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

import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import Header from '@app/Header';
import AppRoutes from '@app/router';

import {
  ErrorProvider,
  ErrorBanner,
  ErrorBoundary,
  toAppError,
  errorBus,
} from '@bee/common/error';

// Option 1: auto-detect from URL
function detectBasename() {
  const first = window.location.pathname.split('/').filter(Boolean)[0] || '';
  return first ? `/${first}` : '/';
}

function detectErrorPath() {
  return 'beegame/error';  // or should we have 'error'
}

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const basename = detectBasename();
  const errorPath = detectErrorPath();

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      errorBus.emit(
        toAppError(event.error || event.message, {
          component: 'window',
          functionName: 'error',
          service: 'runtime',
          severity: 'toast',
        })
      );
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      errorBus.emit(
        toAppError(event.reason, {
          component: 'window',
          functionName: 'unhandledrejection',
          service: 'runtime',
          severity: 'toast',
        })
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <div className="beegame-app-container">
      <BrowserRouter basename={basename}>
        <div className="app-layout">
          <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button
              className="hamburger-icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <Header />
          </div>

          <main className="flex-grow-1">
            <div className="content-container">
              <ErrorProvider errorPath={errorPath}>
                <ErrorBanner />
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </ErrorProvider>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
};

export default App;

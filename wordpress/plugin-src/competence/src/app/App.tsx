import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import CompetenceHeader from '@app/CompetenceHeader';
import AppRoutes from '@app/router';
import { ErrorProvider, ErrorBanner, ErrorBoundary, toAppError, errorBus } from '@bee/common/error';
import ErrorUserBootstrap from '@app/ErrorUserBootstrap';
import { TranslateBox } from '@bee/common/widgets';


function detectBasename() {
  const injected = (window as any)?.competenceSettings?.basename;
  if (injected) return injected;
  const first = location.pathname.split('/').filter(Boolean)[0] || '';
  return first ? `/${first}` : '/';
}
function detectErrorPath() {
  return (window as any)?.competenceSettings?.errorPath || '/error';
}

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const basename = detectBasename();
  const errorPath = detectErrorPath();


  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      errorBus.emit(toAppError(event.error || event.message, {
        component: 'window',
        functionName: 'error',
        service: 'runtime',
        severity: 'toast',
      }));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      errorBus.emit(toAppError(event.reason, {
        component: 'window',
        functionName: 'unhandledrejection',
        service: 'runtime',
        severity: 'toast',
      }));
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);


  return (
    <div className="competence-app-container">
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
            <CompetenceHeader />
          </div>
          <main className="flex-grow-1">
            <div className="content-container">
              <ErrorProvider errorPath={errorPath}>
                <ErrorUserBootstrap />
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



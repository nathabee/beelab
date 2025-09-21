import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import PomoloBeeHeader from '@app/PomoloBeeHeader';
import AppRoutes from '@app/router';
import { ErrorProvider } from '@context/ErrorContext';
import ErrorBanner from '@components/ErrorBanner';
import { ErrorBoundary } from '@components/ErrorBoundary';

// Redirect if at root
//if (window.location.pathname === '/') {
//  window.history.replaceState({}, '', '/pomolobee_dashboard');
//}

const App = () => {
  useEffect(() => {
    // Avoid duplicate script loading
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.type = 'text/javascript';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);

      // Define the callback function
      window.googleTranslateElementInit = () => {
        new google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'fr,en',
            autoDisplay: false,
            default: 'fr'
          },
          'google_translate_element'
        );

        // Force default translation after a delay
        //setTimeout(() => {
        //  setDefaultLanguage('French');
        //}, 1000);
      };

    }
  }, []);





  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div className="pomolobee-app-container">
      <BrowserRouter basename={window.pomolobeeSettings?.basename || '/'}>
        <div className="translate-box" style={{ padding: '10px', textAlign: 'right' }}>
          🌐 Translate : <span id="google_translate_element"></span>
        </div>

        <div className="app-layout">
          {/* Sidebar */}
          <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button
              className="hamburger-icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <PomoloBeeHeader />
          </div>

          {/* Main Content */}
          <div className="content-container">
            <ErrorProvider>
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




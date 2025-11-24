// src/app/BeeFontHeader.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';


import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';

const SIDEBAR_WIDTH = 260; // aktuell ungenutzt, aber okay

const Header: React.FC = () => {
  const { isLoggedIn, logout, user } = useUser();
  const { reset, activeJob } = useApp(); // activeJob kannst du später nutzen
  const navigate = useNavigate();

  const canAccess = !!user;

  const handleLogout = () => {
    logout();
    reset();
  };



  return (
    <nav>
      {/* Scroll only this middle section when links overflow */}
      <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2">
        <Link to="/home" className="nav-link">🏠 Home</Link>

        {isLoggedIn ? (
          <>
            {/* Global navigation entries */}
            <Link to="/joboverview" className="nav-link">📊 Job Overview</Link>
            <Link to="/dashboard" className="nav-link">📊 Dashboard</Link>

            {/* Globale Aktion: immer verfügbar, solange eingeloggt */}


            {activeJob && (
              <div className="mt-3">
                <div className="text-muted small">
                  Active job: {activeJob.name}
                </div>
                <Link to="/printupload" className="nav-link">
                  📄 Upload pages
                </Link>
                <Link to="/glyphbrowser" className="nav-link">
                  🔤 Glyph browser
                </Link>
                <Link to="/fontBuild" className="nav-link">
                  🧱 Build font
                </Link>
              </div>
            )}

            {/* Platzhalter für spätere „context-aware“ Aktionen */}
            {canAccess ? (
              <>
                <span className="nav-link disabled">📄 Nuts Management</span>
              </>
            ) : (
              <>
                <span className="nav-link disabled">📄 Nuts Management</span>
              </>
            )}

            <Link to="/user_mgt" className="nav-link">User Management</Link>
            <Link to="/error_mgt" className="nav-link">Error Management</Link>

            <button
              className="btn btn-outline-secondary mt-2"
              onClick={handleLogout}
            >
              🔓 Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">🔓 Login</Link>
          </>
        )}
      </div>

      {/* Bottom bar: always visible, regardless of page scroll */}
      {!isLoggedIn && (
        <div className="p-3 border-top bg-white">
          <Link to="/login?mode=demo" className="btn btn-warning btn-lg w-100">
            🐝 Try the demo
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Header;

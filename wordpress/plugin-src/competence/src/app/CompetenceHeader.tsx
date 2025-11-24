// src/app/CompetenceHeader.tsx
import React from 'react';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { Link } from 'react-router-dom';

const SIDEBAR_WIDTH = 260; // adjust to your design

const CompetenceHeader = () => {
  const { isLoggedIn, logout, user } = useUser();
  const { activeEleve, activeCatalogues, activeLayout, reset } = useApp();

  const canAccessReport = activeEleve && activeCatalogues.length && activeLayout && user;

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
            <Link to="/dashboard" className="nav-link">📊 Dashboard</Link>
            <Link to="/student_mgt" className="nav-link">👨‍🎓 Student Management</Link>
            <Link to="/pdf_conf" className="nav-link">🛠️ PDF Setup</Link>
            <Link to="/catalogue_mgt" className="nav-link">📚 Catalogue Management</Link>

            {canAccessReport ? (
              <>
                <Link to="/report_mgt" className="nav-link">📄 Report Management</Link>
                <Link to="/overview_test" className="nav-link">🧪 Ongoing Tests</Link>
                <Link to="/pdf_view" className="nav-link">🖨️ PDF Viewer</Link>
              </>
            ) : (
              <>
                <span className="nav-link disabled">📄 Report Management</span>
                <span className="nav-link disabled">🧪 Ongoing Tests</span>
                <span className="nav-link disabled">🖨️ PDF Viewer</span>
              </>
            )}


            <Link to="/user_mgt" className="nav-link">User Management</Link>
            <Link to="/error_mgt" className="nav-link">Error Management</Link>

            <button className="btn btn-outline-secondary mt-2" onClick={handleLogout}>
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
 
export default CompetenceHeader;

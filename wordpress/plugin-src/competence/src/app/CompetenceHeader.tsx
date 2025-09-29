// src/app/CompetenceHeader.tsx
import React from 'react';
import { useApp } from '@context/AuthContext';
import { Link } from 'react-router-dom';



const CompetenceHeader = () => {
  const { isAuthenticated, logout, activeEleve, activeCatalogues, activeLayout, user } = useApp();

  const canAccessReport = activeEleve && activeCatalogues.length && activeLayout && user;


  return (
    <nav className="navbar sticky-navbar">
      <div className="navbar-container">
        <div className="navbar-active-data">
          <Link to="/home" className="nav-link">🏠 Home</Link>

          {isAuthenticated ? (
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

              <button className="navbar-button" onClick={logout}>🔓 Logout</button>
            </>
          ) : (
            <Link to="/login" className="nav-link">🔓 Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default CompetenceHeader;


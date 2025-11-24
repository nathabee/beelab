// src/app/PomoloBeeHeader.tsx
import React from 'react';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { Link } from 'react-router-dom';

const PomoloBeeHeader = () => {
  const { isLoggedIn, logout, user } = useUser();
  const { activeFarm, reset } = useApp();

  const canAccessFarm = !!activeFarm && !!user;

  const handleLogout = () => {
    logout();
    reset();
  };

  return (
    <nav className="navbar sticky-navbar">
      <div className="navbar-container">
        <div className="navbar-active-data">
          <Link to="/" className="nav-link">🏠 Home</Link>

          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="nav-link">📊 Dashboard</Link>
              {canAccessFarm ? (
                <>
                  <Link to="/farm" className="nav-link">Farm Statistic</Link>
                  <Link to="/farmmgt" className="nav-link">Farm Management</Link>
                </>
              ) : (
                <span className="nav-link disabled">Please select a farm</span>
              )}
              <button className="navbar-button" onClick={handleLogout}>🔓 Logout</button>
            </>
          ) : (
            <Link to="/login" className="nav-link">🔓 Login</Link>
          )}

          <Link to="/errormgt" className="nav-link">Error Management</Link>
        </div>
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

export default PomoloBeeHeader;

// src/app/NutshellHeader.tsx
import React from 'react';
import { useUser } from '@bee/common';
import { useApp } from '@context/AppContext';
import { Link } from 'react-router-dom';

const SIDEBAR_WIDTH = 260; // adjust to your design

const Header = () => {
  const { isLoggedIn, logout, user } = useUser();
  const { reset } = useApp();

  const canAccess = user ; // activeNut && user

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
 
export default Header;

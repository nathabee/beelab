// src/app/BeeGameHeader.tsx
import React from 'react'; 
import { useApp } from '@context/AppContext';
import { Link } from 'react-router-dom';

const SIDEBAR_WIDTH = 260; // adjust to your design

const Header = () => { 
  const { reset } = useApp();
  

  return (
  
    <nav>
      {/* Scroll only this middle section when links overflow */}
      <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2">
        <Link to="/home" className="nav-link">🏠 Home</Link>
 
        <Link to="/lifesim" className="nav-link"> Life of Game</Link> 
        <Link to="/forestfire" className="nav-link"> Burning Forest</Link> 
 
 
        <Link to="/error_mgt" className="nav-link">Error Management</Link>
 
        </div>
    </nav>
  );
};
 
export default Header;

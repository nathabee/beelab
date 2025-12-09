// src/app/BeeGameHeader.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@context/AppContext';
import BeeGameLogo from '@app/BeeGameLogo';

const Header = () => {
  const { reset } = useApp();

  return (
    <nav>
      {/* Logo section */}
      <div className="sidebar-logo">
        <BeeGameLogo />
      </div>

      {/* Scrollable links */}
      <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2">
        <Link to="/home" className="nav-link">Home</Link>
        <Link to="/lifesim" className="nav-link">Life of Game</Link>
        <Link to="/forestfire" className="nav-link">Burning Forest</Link>
        <Link to="/epidemic" className="nav-link">Epidemic Spread Model SIR</Link>        
        <Link to="/diffusion" className="nav-link">Diffusion / Heat Map</Link>
        <Link to="/elementary" className="nav-link">Elementary Cellular Automata</Link>
        <Link to="/logisticmap" className="nav-link">Chaos Map / Logistic growth</Link>
        <Link to="/error_mgt" className="nav-link">Error Management</Link>
      </div>
    </nav>
  );
};

export default Header;

// src/pages/Home.tsx
'use client';

import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="bee-beegame-home">

      {/* Intro */}
      <section className="mb-4">
        <h2 className="h4">Welcome to BeeGame</h2>
        <p>
          BeeGame is a collection of interactive, browser-based simulations that run entirely
          inside WordPress using React. Each simulation explores a different mathematical or
          dynamical system — from cellular automata to growth and chaos models.
        </p>
        <p>
          All simulations run directly in your browser with no backend required.
        </p>
      </section>

      {/* Available simulations */}
      <section className="mb-4">
        <h3 className="h5">Available Simulations</h3>

        {/* Game of Life */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="h6">Conway’s Game of Life</h4>
            <p className="mb-2">
              A classic cellular automaton where simple rules create complex and often
              surprising emergent behaviour. Draw your own starting patterns and watch the
              system evolve.
            </p>
            <Link to="/lifesim" className="btn btn-sm btn-primary">
              Start Game of Life
            </Link>
          </div>
        </div>

        {/* Forest Fire */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="h6">Forest Fire Automaton</h4>
            <p className="mb-2">
              A dynamic model of wildfire behaviour. Trees grow, lightning strikes, and fire
              spreads across the grid. A simple set of rules produces waves of growth,
              destruction, and regeneration.
            </p>
            <Link to="/forestfire" className="btn btn-sm btn-primary">
              Start Forest Fire
            </Link>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mb-4">
        <h3 className="h5">Upcoming Simulations</h3>
        <p className="mb-3">
          Additional simulations planned for future versions:
        </p>

        <ul className="list-group small">

          <li className="list-group-item">
            <strong>Epidemic Spread Model (SIR)</strong>
            – infection, recovery, immunity and population behaviour on a grid.
          </li>

          <li className="list-group-item">
            <strong>Diffusion / Heat Map</strong>
            – visualising diffusion of heat or concentration in a continuous field.
          </li>

          <li className="list-group-item">
            <strong>Elementary Cellular Automata</strong>
            – Rule 30, Rule 110, and Rule 90, showcasing complexity from 1D rules.
          </li>
 

          <li className="list-group-item">
            <strong>Logistic Growth & Chaos Map</strong>
            – population growth model (x<sub>n+1</sub> = r·x<sub>n</sub>(1 - x<sub>n</sub>))
            demonstrating stability → bifurcation → chaos.
          </li>

        </ul>

      </section>

      {/* About / footer section */}
      <section className="mb-4">
        <h3 className="h6">About This Plugin</h3>
        <p className="small mb-0">
          BeeGame is designed as a WordPress-native playground for mathematical simulation
          and visual experimentation. Everything runs in the browser using React.
        </p>
      </section>

    </div>
  );
};

export default Home;

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
          dynamical system — from cellular automata to growth, diffusion, and epidemic models.
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
              system evolve over time.
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
              A stylised model of wildfire dynamics. Trees grow, lightning strikes, and fire
              spreads across the grid. Adjust growth and lightning probabilities to explore
              cycles of growth, destruction, and recovery.
            </p>
            <Link to="/forestfire" className="btn btn-sm btn-primary">
              Start Forest Fire
            </Link>
          </div>
        </div>

        {/* Epidemic SIR */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="h6">Epidemic Spread (SIR)</h4>
            <p className="mb-2">
              A grid-based SIR-style model of infection spread. Each agent can be susceptible,
              infectious, or recovered. Tune infection probability, recovery time, and immunity
              to see how outbreaks start, peak, and fade.
            </p>
            <Link to="/epidemic" className="btn btn-sm btn-primary">
              Start Epidemic Simulation
            </Link>
          </div>
        </div>

        {/* Diffusion / Heat Map */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="h6">Diffusion / Heat Map</h4>
            <p className="mb-2">
              A continuous field model for diffusion. Each cell holds a scalar “heat” value.
              Create hot spots, adjust diffusion and decay, and watch how the field smooths
              out or cools down over time.
            </p>
            <Link to="/diffusion" className="btn btn-sm btn-primary">
              Start Diffusion
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
            <strong>Elementary Cellular Automata</strong>
            – 1D rules such as Rule 30, Rule 110, and Rule 90, showing complex patterns
            emerging from very simple local updates.
          </li>

          <li className="list-group-item">
            <strong>Logistic Growth & Chaos Map</strong>
            – a discrete population model
            {' '}x<sub>n+1</sub> = r·x<sub>n</sub>(1 - x<sub>n</sub>) showing the journey from
            stability to period-doubling and chaos as the parameter r increases.
          </li>
        </ul>
      </section>

      {/* About / footer section */}
      <section className="mb-4">
        <h3 className="h6">About This Plugin</h3>
        <p className="small mb-0">
          BeeGame is designed as a WordPress-native playground for mathematical simulation
          and visual experimentation. Everything runs client-side in the browser using React,
          so it is easy to embed, duplicate, and customise within your WordPress site.
        </p>
      </section>

    </div>
  );
};

export default Home;

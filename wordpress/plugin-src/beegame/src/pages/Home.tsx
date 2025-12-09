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
          dynamical system — from cellular automata to growth, diffusion, epidemics, and chaos.
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

        {/* Elementary Cellular Automata */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="h6">Elementary Cellular Automata</h4>
            <p className="mb-2">
              One-dimensional rules such as Rule 30, Rule 90, and Rule 110. Start from a simple
              initial row and watch how a single line of cells generates rich triangular and
              fractal patterns over time.
            </p>
            <Link to="/elementary" className="btn btn-sm btn-primary">
              Start Elementary Automaton
            </Link>
          </div>
        </div>

        {/* Logistic Map */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="h6">Logistic Map (Growth & Chaos)</h4>
            <p className="mb-2">
              The discrete-time population model
              {' '}x<sub>n+1</sub> = r·x<sub>n</sub>(1 - x<sub>n</sub>).
              Slide the parameter r to travel from stable equilibrium through period-doubling
              into chaotic behaviour, and see how a simple formula generates complex dynamics.
            </p>
            <Link to="/logisticmap" className="btn btn-sm btn-primary">
              Start Logistic Map
            </Link>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mb-4">
        <h3 className="h5">More Experiments Coming</h3>
        <p className="mb-3">
          BeeGame is modular. New simulation types can be added as separate pages without
          changing the core plugin. Future versions may explore:
        </p>

        <ul className="list-group small">
          <li className="list-group-item">
            <strong>Phase transitions & percolation</strong>
            – models of connectivity, clustering, and critical thresholds.
          </li>
          <li className="list-group-item">
            <strong>Agent-based swarms</strong>
            – simple motion rules giving rise to flocking and collective behaviour.
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

// src/components/EpidemicSpreadTheorieCard.tsx
'use client';

import React from 'react';

const EpidemicSpreadTheorieCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">Compartment models</h2>
    <p className="mb-2">
      Many epidemic models divide the population into compartments such as:
      {' '}
      <strong>S</strong>usceptible,
      {' '}
      <strong>I</strong>nfectious, and
      {' '}
      <strong>R</strong>ecovered
      (SIR model). Individuals move between these compartments according to transition rates.
    </p>
    <p className="mb-3">
      In a well-mixed setting, the classical SIR model can be written as a system of differential
      equations:
    </p>
    <p className="mb-3">
      <em>
        dS/dt = −β S I / N, dI/dt = β S I / N − γ I, dR/dt = γ I
      </em>,
    </p>
    <p className="mb-3">
      where <em>N</em> is the total population, <em>β</em> is the infection rate, and
      <em>γ</em> is the recovery rate.
    </p>

    <h3 className="h6 mb-2">Basic reproduction number R₀</h3>
    <p className="mb-2">
      A central quantity is the basic reproduction number <strong>R₀</strong>:
    </p>
    <p className="mb-3">
      <em>R₀ = β / γ</em>
      {' '}
      (in the simplest SIR formulation).
    </p>
    <p className="mb-3">
      It measures how many new infections one infectious individual generates in a fully
      susceptible population:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        If <em>R₀ &lt; 1</em>, the infection tends to die out.
      </li>
      <li>
        If <em>R₀ &gt; 1</em>, the infection can grow into an epidemic.
      </li>
    </ul>

    <h3 className="h6 mb-2">Spatial and network effects</h3>
    <p className="mb-2">
      The simulation here is not purely “well-mixed”: individuals are arranged on a grid (or
      network), and infection spreads locally from infected cells to their neighbours. This is a
      spatial SIR/SIS variant:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        Susceptible cells become infected with some probability if they have infected neighbours.
      </li>
      <li>
        Infected cells recover (or are removed) with a certain probability per time step.
      </li>
      <li>
        Some models allow recovered individuals to become susceptible again (SIS).
      </li>
    </ul>

    <h3 className="h6 mb-2">Phase behaviour</h3>
    <p className="mb-2">
      By changing infection and recovery probabilities, you can observe different regimes:
    </p>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Subcritical:</strong> infections appear but quickly die out; clusters remain small.
      </li>
      <li className="mb-1">
        <strong>Critical:</strong> clusters of infection span larger regions; behaviour becomes
        highly variable.
      </li>
      <li className="mb-1">
        <strong>Supercritical:</strong> a large fraction of the population eventually becomes
        infected at some point.
      </li>
    </ul>

    <h3 className="h6 mb-2">What to look for</h3>
    <p className="mb-2">
      The interesting questions are not only “how many are infected”, but also:
    </p>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        How does the peak of infections change when you reduce the infection probability?
      </li>
      <li className="mb-1">
        How sensitive is the long-term outcome (epidemic or extinction) to small parameter changes?
      </li>
      <li className="mb-1">
        How does spatial clustering (neighbour structure) slow down or accelerate the spread?
      </li>
    </ul>
  </div>
);

export default EpidemicSpreadTheorieCard;

// src/components/EpidemicSpreadHelpCard.tsx
'use client';

import React from 'react';

const EpidemicSpreadHelpCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">How to use this simulation</h2>
    <ol className="mb-3 ps-3">
      <li className="mb-1">
        While the simulation is <strong>paused</strong>, click cells on the grid to cycle through
        the three states: susceptible → infected → recovered → susceptible.
      </li>
      <li className="mb-1">
        Use <strong>Random infection</strong> to seed the grid with infected individuals according
        to the current <strong>Initial infected fraction</strong>.
      </li>
      <li className="mb-1">
        Press <strong>Play</strong> to let the epidemic evolve over generations. Each step applies
        the infection, recovery and loss-of-immunity probabilities to every cell.
      </li>
      <li className="mb-1">
        Use <strong>Step</strong> for single-generation updates if you want to inspect the process
        slowly.
      </li>
      <li className="mb-1">
        Switch to the <strong>Statistics</strong> tab to see how the fractions of susceptible,
        infected and recovered individuals change over time.
      </li>
    </ol>

    <h3 className="h6 mb-2">Controls overview</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Grid size:</strong> sets the size of the population. Larger grids behave more like a
        “large” population; small grids are more stochastic.
      </li>
      <li className="mb-1">
        <strong>Boundary mode:</strong> choose between finite edges and toroidal wrapping. Wrapping
        removes edge effects and approximates an infinite tiling.
      </li>
      <li className="mb-1">
        <strong>Infection probability:</strong> chance per step that a susceptible cell with at
        least one infected neighbour becomes infected.
      </li>
      <li className="mb-1">
        <strong>Recovery probability:</strong> chance per step that an infected cell becomes
        recovered.
      </li>
      <li className="mb-1">
        <strong>Loss of immunity:</strong> small probability that a recovered individual becomes
        susceptible again (SIRS behaviour). Set to zero for permanent immunity (SIR).
      </li>
      <li className="mb-1">
        <strong>Initial infected fraction:</strong> used when seeding the grid via “Random
        infection”.
      </li>
      <li className="mb-1">
        <strong>Speed:</strong> controls how quickly generations advance while running.
      </li>
    </ul>

    <h3 className="h6 mb-2">What you can observe</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        For low infection probability (relative to recovery), small clusters of infection that die
        out quickly.
      </li>
      <li className="mb-1">
        For higher infection probability, a clear epidemic wave: infected fraction rises to a peak
        and then falls as more individuals move into the recovered compartment.
      </li>
      <li className="mb-1">
        With loss of immunity switched on, oscillations or a noisy equilibrium where infection
        persists indefinitely.
      </li>
      <li className="mb-1">
        The impact of spatial structure: infection spreads via local neighbourhoods rather than a
        well-mixed population.
      </li>
    </ul>

    <h3 className="h6 mb-2">Suggested experiments</h3>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Start with a mostly susceptible grid and a small infected cluster in the centre. Try a low
        infection probability and slowly increase it. Watch how the peak height and timing of the
        infected curve change in the <strong>Statistics</strong> tab.
      </li>
      <li className="mb-1">
        Set <strong>Loss of immunity</strong> to zero and explore SIR behaviour: does infection
        always die out, and what fraction ends up recovered?
      </li>
      <li className="mb-1">
        Turn on a small <strong>Loss of immunity</strong> and look for regimes where infection
        becomes endemic rather than disappearing.
      </li>
      <li className="mb-1">
        Compare <strong>finite</strong> vs <strong>toroidal</strong> boundaries: do edge effects
        stop waves of infection or reflect them?
      </li>
    </ul>
  </div>
);

export default EpidemicSpreadHelpCard;

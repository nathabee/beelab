// src/components/LifeSimHelpCard.tsx
'use client';

import React from 'react';

const LifeSimHelpCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">How to use this simulation</h2>
    <ol className="mb-3 ps-3">
      <li className="mb-1">
        While the simulation is <strong>paused</strong>, click cells in the grid to toggle them
        alive or dead. You can also use <strong>Randomize</strong> to fill part of the grid
        automatically.
      </li>
      <li className="mb-1">
        Press <strong>Play</strong> to let the pattern evolve generation by generation. Use the
        <strong> Speed</strong> slider to make the animation faster or slower.
      </li>
      <li className="mb-1">
        Use <strong>Step</strong> to advance exactly one generation at a time. This is useful when
        you want to follow the rules carefully.
      </li>
      <li className="mb-1">
        Use <strong>Clear</strong> to reset the grid, or load one of the <strong>Presets</strong> to
        start from a classic pattern.
      </li>
      <li className="mb-1">
        Switch to the <strong>Statistics</strong> tab to see how the population changes over time
        (alive cells, births, deaths per generation).
      </li>
    </ol>

    <h3 className="h6 mb-2">What you can observe</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Still lifes:</strong> patterns that stop changing after a few generations.
      </li>
      <li className="mb-1">
        <strong>Oscillators:</strong> patterns that repeat after 2, 3, or more generations.
      </li>
      <li className="mb-1">
        <strong>Spaceships:</strong> patterns that move across the grid while repeating.
      </li>
      <li className="mb-1">
        <strong>Chaotic bursts:</strong> random initial states that expand, then simplify into a mix
        of still lifes and oscillators.
      </li>
    </ul>

    <h3 className="h6 mb-2">Suggested experiments</h3>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Start with a <strong>glider</strong> preset. Run once with <strong>finite</strong> boundary
        mode and once with <strong>wrapping</strong>. Watch what happens when the glider reaches the
        border.
      </li>
      <li className="mb-1">
        Use <strong>Randomize</strong> with a low density (around 10–20 percent) and watch how the
        alive curve behaves in the <strong>Statistics</strong> tab. Does the population die out or
        stabilise?
      </li>
      <li className="mb-1">
        Choose a small grid (for example 20×20), place a few random cells by hand, and advance with
        <strong> Step</strong> to see exactly how births and deaths follow the rules.
      </li>
      <li className="mb-1">
        Try the same initial pattern once with <strong>finite</strong> and once with
        <strong> wrapping</strong> boundaries. Compare the long-term behaviour.
      </li>
    </ul>
  </div>
);

export default LifeSimHelpCard;

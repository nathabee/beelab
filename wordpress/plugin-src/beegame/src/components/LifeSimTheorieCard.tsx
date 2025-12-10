// src/components/LifeSimTheoryCard.tsx
'use client';

import React from 'react';

const LifeSimTheoryCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">Background and history</h2>
    <p className="mb-2">
      The Game of Life is a <strong>cellular automaton</strong> invented by the British mathematician
      <strong> John Horton Conway</strong> around 1970. It became widely known through Martin
      Gardner&apos;s articles in the magazine <em>Scientific American</em>.
    </p>
    <p className="mb-3">
      Despite its very simple rules, the Game of Life can produce extremely complex patterns and has
      been used as a classic example of how <strong>complex behaviour</strong> can emerge from
      <strong> simple local rules</strong>.
    </p>

    <h3 className="h6 mb-2">Rules B3/S23</h3>
    <p className="mb-2">
      This implementation uses Conway&apos;s original rule set, usually written as <strong>B3/S23</strong>:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        <strong>B3 (Birth):</strong> a dead cell with exactly three live neighbours becomes alive.
      </li>
      <li>
        <strong>S23 (Survival):</strong> a live cell with two or three live neighbours stays alive.
      </li>
      <li>
        In all other cases, a live cell becomes dead in the next generation.
      </li>
    </ul>
    <p className="mb-3">
      Neighbours are the eight surrounding cells (horizontal, vertical, and diagonal). The rule
      notation can be generalised: many other cellular automata are written in the same B/S form.
    </p>

    <h3 className="h6 mb-2">Boundary conditions</h3>
    <p className="mb-2">
      Mathematically, the Game of Life is defined on an infinite grid. On a finite computer screen,
      we must decide what happens at the edges:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        <strong>Finite grid:</strong> cells outside the visible area are always dead. Patterns can
        fall off the edge.
      </li>
      <li>
        <strong>Toroidal grid:</strong> the grid wraps around horizontally and vertically, like the
        surface of a torus. A pattern leaving one side reappears on the opposite side.
      </li>
    </ul>

    <h3 className="h6 mb-2">Pattern types and dynamics</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Still lifes:</strong> patterns that no longer change (for example, block, beehive).
      </li>
      <li className="mb-1">
        <strong>Oscillators:</strong> patterns that repeat after a fixed number of generations
        (period 2, 3, …), such as blinker or pulsar.
      </li>
      <li className="mb-1">
        <strong>Spaceships:</strong> patterns that move across the grid while repeating (for example
        glider, lightweight spaceship).
      </li>
      <li className="mb-1">
        <strong>Glider guns:</strong> complex patterns that emit an endless stream of gliders.
      </li>
    </ul>

    <h3 className="h6 mb-2">Complexity aspects</h3>
    <p className="mb-2">
      The Game of Life is known to be <strong>Turing complete</strong>: in principle, it can compute
      anything that a universal computer can, if you encode information in the right patterns.
    </p>
    <p className="mb-0">
      From a mathematical point of view, researchers study questions such as growth rates of
      patterns, classification of oscillators and spaceships, and the statistical behaviour of
      random initial conditions. Your <strong>Statistics</strong> tab is a small step towards
      visualising this kind of behaviour for finite grids.
    </p>
  </div>
);

export default LifeSimTheoryCard;

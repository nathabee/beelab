// src/components/ElementaryAutomataHelpCard.tsx
'use client';

import React from 'react';

const ElementaryAutomataHelpCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">How to use this simulation</h2>
    <ol className="mb-3 ps-3">
      <li className="mb-1">
        While the automaton is <strong>paused</strong>, edit the
        <strong> bottom row</strong> of the grid by clicking cells on or off. This bottom row is the
        current generation.
      </li>
      <li className="mb-1">
        Use <strong>Randomize initial row</strong> to fill the bottom row according to the current
        <strong> Random initial density</strong> slider.
      </li>
      <li className="mb-1">
        Press <strong>Play</strong> to let the automaton generate new rows. Each new generation is
        added below, and older generations are pushed upwards.
      </li>
      <li className="mb-1">
        Use <strong>Step</strong> to advance exactly one generation at a time if you want to inspect
        how the rule acts on each row.
      </li>
      <li className="mb-1">
        Switch to the <strong>Statistics</strong> tab to see how the density of 1s and the number of
        0↔1 transitions change over time.
      </li>
    </ol>

    <h3 className="h6 mb-2">Controls overview</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Row width:</strong> number of cells in each generation. Wider rows give more space
        for structures to develop.
      </li>
      <li className="mb-1">
        <strong>Boundary mode:</strong> choose between finite edges (cells outside the row are 0)
        and wrapping, where the row behaves like a ring.
      </li>
      <li className="mb-1">
        <strong>Random initial density:</strong> probability that a cell is 1 when you randomise the
        initial row.
      </li>
      <li className="mb-1">
        <strong>Rule (0–255):</strong> selects the local update rule. You can type a number or drag
        the slider; the binary representation is shown as eight bits.
      </li>
      <li className="mb-1">
        <strong>Speed:</strong> controls how quickly new generations are added while running.
      </li>
    </ul>

    <h3 className="h6 mb-2">What you can observe</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        For some rules, patterns quickly die out or become very simple (homogeneous or periodic).
      </li>
      <li className="mb-1">
        Other rules generate nested, fractal-like patterns or seemingly random noise.
      </li>
      <li className="mb-1">
        The <strong>alive fraction</strong> curve shows how dense the last row is over time; the
        <strong> transitions fraction</strong> curve indicates how fragmented or “patchy” the row
        is.
      </li>
    </ul>

    <h3 className="h6 mb-2">Suggested experiments</h3>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Set the width to a moderate value (e.g. 80), start with a single 1 in the centre, and try
        classic rules:
        {' '}
        <strong>90</strong>
        {' '}
        (Sierpinski triangle),
        {' '}
        <strong>30</strong>
        {' '}
        (chaotic),
        {' '}
        <strong>110</strong>
        {' '}
        (complex structures).
      </li>
      <li className="mb-1">
        For each rule, compare <strong>finite</strong> vs <strong>wrapping</strong> boundaries. Do
        edge effects change the long-term pattern?
      </li>
      <li className="mb-1">
        Start from the same random initial row but slightly change the rule number (e.g. 30 vs 31).
        Watch how sensitive the patterns and statistics are.
      </li>
      <li className="mb-1">
        Keep the rule fixed and change the random initial density. Does a denser starting row lead
        to more or less structure in the long run?
      </li>
    </ul>
  </div>
);

export default ElementaryAutomataHelpCard;

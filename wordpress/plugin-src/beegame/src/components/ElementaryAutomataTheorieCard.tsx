// src/components/ElementaryAutomataTheorieCard.tsx
'use client';

import React from 'react';

const ElementaryAutomataTheorieCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">What are elementary cellular automata?</h2>
    <p className="mb-2">
      Elementary cellular automata are one-dimensional cellular automata with:
    </p>
    <ul className="mb-3 ps-3">
      <li>a line of cells, each either 0 (dead) or 1 (alive),</li>
      <li>
        updates in discrete time steps,
      </li>
      <li>
        and local rules that depend only on a cell and its two immediate neighbours.
      </li>
    </ul>
    <p className="mb-3">
      At each step, all cells are updated simultaneously according to the same local rule. Despite
      the minimal setup, the resulting patterns range from simple repetition to complex,
      apparently random structures.
    </p>

    <h3 className="h6 mb-2">Rule numbers (Wolfram code)</h3>
    <p className="mb-2">
      Stephen Wolfram popularised a notation in which each possible local rule is represented by a
      number from 0 to 255. The rule number encodes the output for the eight possible neighbour
      configurations:
    </p>
    <p className="mb-3">
      111, 110, 101, 100, 011, 010, 001, 000
    </p>
    <p className="mb-3">
      For each pattern (like 110 or 001) the rule specifies whether the centre cell becomes 0 or 1
      in the next step. Writing those eight outputs as a binary number gives a code between 0 and
      255; this code is the rule number.
    </p>

    <h3 className="h6 mb-2">Behaviour classes</h3>
    <p className="mb-2">
      Wolfram grouped rules into qualitative classes:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        <strong>Class I:</strong> patterns quickly evolve to a homogeneous state (all 0 or all 1).
      </li>
      <li>
        <strong>Class II:</strong> patterns settle into simple periodic or nested structures.
      </li>
      <li>
        <strong>Class III:</strong> patterns show persistent chaos-like, irregular behaviour.
      </li>
      <li>
        <strong>Class IV:</strong> complex, long-lived structures with localised “particles”
        interacting; candidates for computation and universality.
      </li>
    </ul>

    <h3 className="h6 mb-2">Famous rules</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Rule 30:</strong> produces chaotic patterns from simple initial conditions and has
        been used as a pseudo-random generator.
      </li>
      <li className="mb-1">
        <strong>Rule 90:</strong> generates a Sierpinski triangle pattern from a single 1.
      </li>
      <li className="mb-1">
        <strong>Rule 110:</strong> proven to be Turing complete: it can simulate any computation
        given the right initial configuration.
      </li>
    </ul>

    <h3 className="h6 mb-2">What to look for</h3>
    <p className="mb-2">
      When you change the rule number or the initial state, you are effectively exploring the
      “space” of one-dimensional update rules. Interesting questions are:
    </p>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        For which rules does a single active cell generate simple, predictable patterns?
      </li>
      <li className="mb-1">
        Which rules appear chaotic, and do they still hide regular structures on larger scales?
      </li>
      <li className="mb-1">
        How sensitive are the patterns to small changes in the initial row?
      </li>
    </ul>
  </div>
);

export default ElementaryAutomataTheorieCard;

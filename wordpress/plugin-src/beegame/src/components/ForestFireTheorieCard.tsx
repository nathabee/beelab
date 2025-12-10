// src/components/ForestFireTheorieCard.tsx
'use client';

import React from 'react';

const ForestFireTheorieCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">Forest-fire cellular automata</h2>
    <p className="mb-2">
      Forest-fire models are cellular automata that simulate trees growing, burning, and leaving
      empty space. Each cell is in one of a few states, typically:
    </p>
    <ul className="mb-3 ps-3">
      <li>empty ground,</li>
      <li>tree,</li>
      <li>burning tree.</li>
    </ul>
    <p className="mb-3">
      The grid is updated in discrete time steps using simple local rules. Even these basic rules
      can produce complex behaviour such as fire fronts, patchy forests, and repeated burn–regrow
      cycles.
    </p>

    <h3 className="h6 mb-2">Typical update rules</h3>
    <p className="mb-2">
      A common variant (the Drossel–Schwabl model) uses probabilistic rules:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        A burning tree becomes empty in the next step.
      </li>
      <li>
        A tree catches fire if at least one neighbour is burning.
      </li>
      <li>
        A tree can also ignite spontaneously with a small “lightning” probability <em>f</em>.
      </li>
      <li>
        Empty ground becomes a tree with a regrowth probability <em>p</em>.
      </li>
    </ul>
    <p className="mb-3">
      By tuning the regrowth rate and lightning probability, the system can move between sparse
      isolated fires and large, system-spanning fire events.
    </p>

    <h3 className="h6 mb-2">Self-organised criticality</h3>
    <p className="mb-2">
      Forest-fire models are often discussed in the context of <strong>self-organised criticality</strong>.
      In certain parameter ranges, the system appears to organise itself into a critical state with no intrinsic length
      scale:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        Fire sizes can follow broad, approximately power-law distributions.
      </li>
      <li>
        There is a wide spectrum of event sizes rather than a single typical scale.
      </li>
    </ul>
    <p className="mb-3">
      The forest slowly builds up fuel (trees), and occasionally a lightning event triggers a fire
      that consumes part of the forest, resetting the local density.
    </p>

    <h3 className="h6 mb-2">Percolation and connectivity</h3>
    <p className="mb-2">
      The ability of fire to spread across the system is closely related to percolation theory:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        When trees are sparse, connected clusters are small; fires stay local.
      </li>
      <li>
        When tree density is high enough, there can be clusters that span the grid; a single
        ignition can burn a macroscopic fraction of the forest.
      </li>
    </ul>

    <h3 className="h6 mb-2">What to look for</h3>
    <p className="mb-2">
      With different tree-growth and lightning probabilities, you can observe:
    </p>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Regimes where the forest is mostly empty with occasional small fires.
      </li>
      <li className="mb-1">
        Dense forests where large fires sweep through periodically.
      </li>
      <li className="mb-1">
        Patterns that suggest a balance between growth and destruction, with clusters of many sizes.
      </li>
    </ul>
  </div>
);

export default ForestFireTheorieCard;

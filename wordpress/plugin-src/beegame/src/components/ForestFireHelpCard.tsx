// src/components/ForestFireHelpCard.tsx
'use client';

import React from 'react';

const ForestFireHelpCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">How to use this simulation</h2>
    <ol className="mb-3 ps-3">
      <li className="mb-1">
        While the simulation is <strong>paused</strong>, click cells on the grid to cycle through
        <strong> empty → tree → burning → empty</strong>.
      </li>
      <li className="mb-1">
        Use <strong>Randomize forest</strong> to fill the grid with trees according to a fixed
        probability (initial forest density).
      </li>
      <li className="mb-1">
        Press <strong>Play</strong> to let the forest evolve. Trees can grow, catch fire from
        neighbours, and burn down to empty cells.
      </li>
      <li className="mb-1">
        Use <strong>Step</strong> for single-generation updates if you want to see exactly how the
        rules act from one frame to the next.
      </li>
      <li className="mb-1">
        Switch to the <strong>Statistics</strong> tab to see how the fraction of trees and burning
        cells changes over time.
      </li>
    </ol>

    <h3 className="h6 mb-2">Controls overview</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Grid size:</strong> sets how many cells the forest has. Larger grids show more
        clearly the balance between growth and fire.
      </li>
      <li className="mb-1">
        <strong>Boundary mode:</strong> choose between finite edges and toroidal wrapping.
        Wrapping removes edges so the forest tiles infinitely.
      </li>
      <li className="mb-1">
        <strong>Tree growth probability:</strong> chance per step that an <strong>empty</strong> cell
        becomes a tree.
      </li>
      <li className="mb-1">
        <strong>Lightning probability:</strong> chance per step that a <strong>tree</strong> ignites
        spontaneously (without a burning neighbour).
      </li>
      <li className="mb-1">
        <strong>Spread probability:</strong> chance that a tree with a burning neighbour catches
        fire. In this version it is kept at 1 by default (fire always spreads), but the control
        exists in the context.
      </li>
      <li className="mb-1">
        <strong>Speed:</strong> controls how fast generations advance while running.
      </li>
    </ul>

    <h3 className="h6 mb-2">What you can observe</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        For very low growth, trees are scarce and fires are small and rare.
      </li>
      <li className="mb-1">
        For intermediate growth and lightning, the forest spends time near a kind of
        <strong> critical state</strong>: large fires occur at many scales.
      </li>
      <li className="mb-1">
        For very high growth and low lightning, the forest stays dense and fires are rare but can
        be catastrophic when they occur.
      </li>
      <li className="mb-1">
        In the <strong>Statistics</strong> tab you can see how tree cover builds up between fires
        and drops suddenly when a large fire passes through.
      </li>
    </ul>

    <h3 className="h6 mb-2">Suggested experiments</h3>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Start with a random dense forest. Fix a small lightning probability and slowly increase the
        tree growth probability. Look for a regime where the system neither empties out nor fills
        completely, but hovers in between.
      </li>
      <li className="mb-1">
        Set lightning to zero and ignite a small region manually. Observe how far the fire spreads
        in a very dense vs a sparse forest.
      </li>
      <li className="mb-1">
        Compare <strong>finite</strong> vs <strong>toroidal</strong> boundaries: do fires stop at
        the edge, or wrap around and continue from the opposite side?
      </li>
      <li className="mb-1">
        If you expose the <strong>spread probability</strong> slider, try values below 1. How does
        partially stopping fire spread change the pattern of burned areas and the long-term tree
        fraction?
      </li>
    </ul>
  </div>
);

export default ForestFireHelpCard;

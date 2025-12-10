// src/components/DiffusionHelpCard.tsx
'use client';

import React from 'react';

const DiffusionHelpCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">How to use this simulation</h2>
    <ol className="mb-3 ps-3">
      <li className="mb-1">
        While the simulation is <strong>paused</strong>, click cells in the heat map to toggle
        between cold (0) and hot (1) sources. These act as initial temperature peaks.
      </li>
      <li className="mb-1">
        Use <strong>Random field</strong> to seed the grid with random values between 0 and the
        current <strong>Random max intensity</strong>.
      </li>
      <li className="mb-1">
        Press <strong>Play</strong> to let heat diffuse across the grid. The
        <strong> Speed</strong> slider controls how quickly generations advance.
      </li>
      <li className="mb-1">
        Use <strong>Step</strong> to advance a single diffusion step and follow the process more
        carefully.
      </li>
      <li className="mb-1">
        Adjust <strong>Diffusion rate</strong> and <strong>Decay rate</strong> to explore different
        regimes, and switch to the <strong>Statistics</strong> tab to see how global quantities
        evolve.
      </li>
    </ol>

    <h3 className="h6 mb-2">Controls overview</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Diffusion rate:</strong> how strongly each cell is pulled towards the average of its
        neighbours. Higher values smooth the field faster.
      </li>
      <li className="mb-1">
        <strong>Decay rate:</strong> global cooling. Set to zero for pure diffusion; increase to let
        all values slowly drift towards zero.
      </li>
      <li className="mb-1">
        <strong>Random max intensity:</strong> upper bound when seeding the grid with random values.
        At 1.0 you get bright peaks; at 0.2 you get a faint, low-contrast field.
      </li>
      <li className="mb-1">
        <strong>Boundary mode:</strong> choose between finite “no-flux” edges and toroidal
        wrapping. Wrapping behaves like an infinite tiling of the grid.
      </li>
      <li className="mb-1">
        <strong>Grid size:</strong> change the resolution of the field. Larger grids show smoother
        gradients but require more updates.
      </li>
    </ul>

    <h3 className="h6 mb-2">What you can observe</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        Peaks spreading out into smooth gradients as diffusion proceeds.
      </li>
      <li className="mb-1">
        With <strong>Decay rate = 0</strong>, the colour distribution flattens while the global
        average (total heat) stays roughly constant.
      </li>
      <li className="mb-1">
        With <strong>Decay rate &gt; 0</strong>, the whole field cools down over time; peaks fade
        out instead of just spreading.
      </li>
      <li className="mb-1">
        In <strong>toroidal</strong> mode, heat can wrap around edges and meet itself on the opposite
        side; in finite mode, peaks reflect at the edges because of the “no-flux” boundary.
      </li>
    </ul>

    <h3 className="h6 mb-2">Suggested experiments</h3>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Place a single hot cell in the centre with <strong>Decay rate = 0</strong>. Let it run and
        watch the colour gradient become perfectly smooth while the average stays constant in the
        <strong> Statistics</strong> tab.
      </li>
      <li className="mb-1">
        Seed a random field with <strong>Random max intensity</strong> set to 1.0. Try a low
        diffusion rate (slow smoothing) versus a high one. Compare how quickly
        <strong> max − min</strong> shrinks in the statistics.
      </li>
      <li className="mb-1">
        With a moderate diffusion rate, gradually increase the <strong>Decay rate</strong> and
        observe how the average and total mass curves begin to drop instead of staying flat.
      </li>
      <li className="mb-1">
        Compare <strong>finite</strong> and <strong>toroidal</strong> boundaries using the same
        initial pattern. How do edge effects show up in the heat map and in the statistics?
      </li>
    </ul>
  </div>
);

export default DiffusionHelpCard;

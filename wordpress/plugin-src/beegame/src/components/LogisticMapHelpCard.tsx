// src/components/LogisticMapHelpCard.tsx
'use client';

import React from 'react';

const LogisticMapHelpCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">How to use this simulation</h2>
    <ol className="mb-3 ps-3">
      <li className="mb-1">
        Choose a value for the control parameter <strong>r</strong> (between 0 and 4) and an initial
        value <strong>x₀</strong> (between 0 and 1).
      </li>
      <li className="mb-1">
        Press <strong>Step</strong> to apply the logistic map once. Each step computes a new value
        xₙ₊₁ from xₙ and adds it to the orbit.
      </li>
      <li className="mb-1">
        Press <strong>Play</strong> to iterate automatically until the <strong>maximum steps</strong>{' '}
        limit is reached or you pause the simulation.
      </li>
      <li className="mb-1">
        Use <strong>Reset</strong> (Clear) to discard the current orbit and start again from the
        current x₀.
      </li>
      <li className="mb-1">
        Use <strong>Random x₀</strong> to pick a new random starting point x₀ ∈ [0, 1].
      </li>
      <li className="mb-1">
        Switch to the <strong>Statistics</strong> tab to see a separate plot and summary of the
        orbit values xₙ.
      </li>
    </ol>

    <h3 className="h6 mb-2">Controls overview</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        <strong>Parameter r:</strong> controls how strongly the population responds to its current
        value. Small r → convergence to 0; larger r → non-trivial fixed points, cycles and chaos.
      </li>
      <li className="mb-1">
        <strong>Initial value x₀:</strong> starting point of the orbit. In chaotic regimes, tiny
        changes in x₀ can lead to very different trajectories.
      </li>
      <li className="mb-1">
        <strong>Maximum plotted steps:</strong> cap on the number of iterations. When this many
        steps are reached, the simulation stops automatically.
      </li>
      <li className="mb-1">
        <strong>Speed:</strong> time between steps when the simulation is running.
      </li>
    </ul>

    <h3 className="h6 mb-2">What you can observe</h3>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        For <strong>0 &lt; r &lt; 1</strong>, the orbit collapses to 0 regardless of x₀.
      </li>
      <li className="mb-1">
        For <strong>1 &lt; r &lt; 3</strong>, the system typically converges to a single non-zero
        fixed point.
      </li>
      <li className="mb-1">
        For <strong>3 &lt; r ≲ 3.57</strong>, you see period–2, then period–4, period–8, and so on
        (period-doubling cascade).
      </li>
      <li className="mb-1">
        For larger r, the map becomes <strong>chaotic</strong>: xₙ jumps around in an apparently
        random way, but still stays in [0, 1].
      </li>
      <li className="mb-1">
        In the statistics view, min, max and mean give a quick summary of how the orbit explores the
        interval [0, 1].
      </li>
    </ul>

    <h3 className="h6 mb-2">Suggested experiments</h3>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Fix x₀ ≈ 0.2 and slowly increase r from 2.5 to 3.5 in small steps. Watch the orbit change
        from convergence to oscillations and then to chaos.
      </li>
      <li className="mb-1">
        In a clearly chaotic regime (for example r = 3.9), run the simulation twice with two very
        close initial values (e.g. x₀ = 0.200 and x₀ = 0.201). Compare the curves: they start
        together but soon diverge.
      </li>
      <li className="mb-1">
        Try different <strong>maximum steps</strong>. In non-chaotic regimes the orbit usually
        settles quickly; in chaotic regimes it keeps exploring without repeating simple patterns.
      </li>
      <li className="mb-1">
        Look at the statistics: in some regimes the mean x stays close to a particular value, even
        though individual steps fluctuate wildly.
      </li>
    </ul>
  </div>
);

export default LogisticMapHelpCard;

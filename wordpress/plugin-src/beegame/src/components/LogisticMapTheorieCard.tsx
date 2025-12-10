// src/components/LogisticMapTheorieCard.tsx
'use client';

import React from 'react';

const LogisticMapTheorieCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">The logistic map</h2>
    <p className="mb-2">
      The logistic map is a classic one-dimensional dynamical system defined by the recurrence
    </p>
    <p className="mb-3">
      <em>x<sub>n+1</sub> = r x<sub>n</sub> (1 − x<sub>n</sub>)</em>,
    </p>
    <p className="mb-3">
      where <em>0 ≤ x<sub>n</sub> ≤ 1</em> represents a normalised population at time <em>n</em>,
      and <em>r</em> is a growth parameter. It was originally introduced as a simple model of
      population growth with limited resources.
    </p>

    <h3 className="h6 mb-2">Fixed points and stability</h3>
    <p className="mb-2">
      Fixed points satisfy <em>x<sub>*</sub> = r x<sub>*</sub> (1 − x<sub>*</sub>)</em>. For
      <em>0 &lt; r ≤ 4</em>, the map has up to two fixed points:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        <em>x<sub>*</sub> = 0</em>,
      </li>
      <li>
        <em>x<sub>*</sub> = 1 − 1/r</em> (for <em>r &gt; 1</em>).
      </li>
    </ul>
    <p className="mb-3">
      The stability of these points depends on the derivative of the map at the fixed point. As
      <em>r</em> increases, fixed points lose stability and give way to periodic orbits.
    </p>

    <h3 className="h6 mb-2">Period-doubling route to chaos</h3>
    <p className="mb-2">
      As you increase <em>r</em>, the logistic map exhibits a sequence of bifurcations:
    </p>
    <ul className="mb-3 ps-3">
      <li className="mb-1">
        For small <em>r</em>, trajectories converge to a stable fixed point.
      </li>
      <li className="mb-1">
        Beyond a critical value, the fixed point becomes unstable and a period-2 orbit appears.
      </li>
      <li className="mb-1">
        Further increases in <em>r</em> lead to period-4, period-8, and so on: a cascade of
        period-doubling bifurcations.
      </li>
      <li className="mb-1">
        Eventually, the behaviour becomes chaotic: trajectories are highly sensitive to initial
        conditions and no longer settle into a simple repeating pattern.
      </li>
    </ul>

    <p className="mb-3">
      This period-doubling route to chaos is a universal phenomenon observed in many nonlinear
      systems. The distances between successive bifurcation values of <em>r</em> follow the
      Feigenbaum scaling.
    </p>

    <h3 className="h6 mb-2">Sensitivity to initial conditions</h3>
    <p className="mb-2">
      In the chaotic regime, two initial values that differ only slightly will generate trajectories
      that diverge rapidly. This is one hallmark of deterministic chaos: the system is completely
      deterministic, yet long-term predictions become practically impossible.
    </p>

    <h3 className="h6 mb-2">What to look for</h3>
    <p className="mb-2">
      When you vary the parameter <em>r</em> and iterate the map, you can observe:
    </p>
    <ul className="mb-0 ps-3">
      <li className="mb-1">
        Convergence to a single value (stable fixed point) for small <em>r</em>.
      </li>
      <li className="mb-1">
        Emergence of 2-cycle, 4-cycle, 8-cycle, … as <em>r</em> increases.
      </li>
      <li className="mb-1">
        Chaotic behaviour for larger <em>r</em>, where the iterates fill an interval in a seemingly
        irregular way.
      </li>
      <li className="mb-1">
        Strong dependence on the initial value when the system is chaotic.
      </li>
    </ul>
  </div>
);

export default LogisticMapTheorieCard;

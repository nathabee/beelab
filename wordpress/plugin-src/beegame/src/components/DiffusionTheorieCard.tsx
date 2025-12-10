// src/components/DiffusionTheorieCard.tsx
'use client';

import React from 'react';

const DiffusionTheorieCard: React.FC = () => (
  <div className="small">
    <h2 className="h6 mb-2">Physical background</h2>
    <p className="mb-2">
      Diffusion describes how particles spread out from regions of high concentration to regions of
      low concentration due to random motion. In a microscopic picture, each particle performs a
      random walk; the macroscopic effect is a smooth spreading of concentration over time.
    </p>
    <p className="mb-3">
      In continuous space and time, the average concentration <em>c(x, t)</em> obeys the diffusion
      equation
      {' '}
      <em>∂c/∂t = D ∇²c</em>, where <em>D</em> is the diffusion coefficient. The simulation here
      uses a discrete lattice and time steps, but the qualitative behaviour is the same: peaks
      flatten out and concentration gradients even out.
    </p>

    <h3 className="h6 mb-2">Discrete model</h3>
    <p className="mb-2">
      On a grid, diffusion is approximated by repeatedly averaging each cell with its neighbours.
      A typical update rule is
    </p>
    <p className="mb-3">
      <em>c<sub>new</sub>(i, j) = (1 − α) c(i, j) + α · mean(neighbours)</em>,
    </p>
    <p className="mb-3">
      where <em>α</em> is a diffusion strength per time step. Small values of <em>α</em> cause slow
      diffusion; large values make the system smooth out quickly but can become numerically
      unstable if chosen too large.
    </p>

    <h3 className="h6 mb-2">Mean squared displacement</h3>
    <p className="mb-2">
      For a single random walker, the average squared distance from the starting point grows
      linearly with time:
    </p>
    <p className="mb-3">
      <em>⟨r²⟩ ∝ t</em>.
    </p>
    <p className="mb-3">
      In a many-particle system, the width of a concentration peak behaves similarly: the peak
      spreads, and its characteristic width (standard deviation) increases roughly like
      <em>√t</em>. This is a key signature of diffusive behaviour.
    </p>

    <h3 className="h6 mb-2">Boundary conditions</h3>
    <p className="mb-2">
      The behaviour at the boundaries strongly influences the global dynamics:
    </p>
    <ul className="mb-3 ps-3">
      <li>
        <strong>Closed boundaries:</strong> no flux across the edges; mass is conserved inside the
        domain.
      </li>
      <li>
        <strong>Open / absorbing boundaries:</strong> particles that reach the edge can leave the
        system, so total mass can decrease.
      </li>
      <li>
        <strong>Periodic boundaries:</strong> the grid wraps around, effectively modelling an
        infinite repeating system.
      </li>
    </ul>

    <h3 className="h6 mb-2">What to look for</h3>
    <p className="mb-2">
      From a theoretical point of view, you are looking at how an initially non-uniform
      concentration approaches a more uniform state. You can compare:
    </p>
    <ul className="mb-0 ps-3">
      <li className="mb-1">How quickly sharp peaks smooth out for different diffusion strengths.</li>
      <li className="mb-1">
        How boundary conditions change the long-term distribution (mass conserved or not).
      </li>
      <li className="mb-1">
        How local averages approximate the continuous diffusion equation for small time steps.
      </li>
    </ul>
  </div>
);

export default DiffusionTheorieCard;

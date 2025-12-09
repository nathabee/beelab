// src/components/DiffusionControl.tsx
'use client';

import React, { useState } from 'react';
import { useDiffusion } from '@context/DiffusionContext';

import PlayControls from '@components/common/PlayControls';
import SpeedSlider from '@components/common/SpeedSlider';
import GridSizeControl from '@components/common/GridSizeControl';
import BoundaryModeSelect from '@components/common/BoundaryModeSelect';

const DiffusionControl: React.FC = () => {
  const { state, actions } = useDiffusion();

  const {
    isRunning,
    intervalMs,
    gridWidth,
    gridHeight,
    boundaryMode,
    diffusionRate,
    decayRate,
    randomMaxIntensity,
    generation,
    minValue,
    maxValue,
    avgValue,
  } = state;

  const {
    setRunning,
    stepOnce,
    clearField,
    randomizeField,
    resizeGrid,
    setSpeed,
    setBoundaryMode,
    setDiffusionRate,
    setDecayRate,
    setRandomMaxIntensity,
  } = actions;

  const [showHelp, setShowHelp] = useState(true);

  const handleApplySize = (w: number, h: number) => {
    resizeGrid(w, h);
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
  };

  const handleDiffusionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setDiffusionRate(v);
  };

  const handleDecayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setDecayRate(v);
  };

  const handleRandomIntensityChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setRandomMaxIntensity(v);
  };

  return (
    <div className="card">
      <div className="card-body">
        {/* Header + help toggle */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Diffusion Controls</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => setShowHelp(v => !v)}
          >
            {showHelp ? 'Hide help' : 'Model info'}
          </button>
        </div>

        {showHelp && (
          <div className="alert alert-info small mb-3">
            <strong>Model:</strong> a scalar field (heat or concentration) diffuses over the grid.
            <ul className="mb-1 ps-3">
              <li>
                Each cell holds a value between 0 (cold/empty) and 1 (hot/high concentration).
              </li>
              <li>
                At each step, values move towards the average of their neighbours
                (<strong>Diffusion</strong>).
              </li>
              <li>
                Optionally, values decay over time (<strong>Decay</strong>).
              </li>
            </ul>
            <div>
              Click cells to create hot spots, or use <strong>Random field</strong> as a starting
              point.
            </div>
          </div>
        )}

        {/* Status */}
        <div className="mb-3 small text-muted">
          <div>
            Status:{' '}
            {isRunning ? (
              <span className="text-success">Running</span>
            ) : (
              <span className="text-secondary">Paused</span>
            )}
          </div>
          <div>Generation: {generation}</div>
          <div>
            min {minValue.toFixed(2)} · max {maxValue.toFixed(2)} · avg{' '}
            {avgValue.toFixed(2)}
          </div>
        </div>

        {/* Shared play controls */}
        <PlayControls
          isRunning={isRunning}
          onToggleRun={() => setRunning(!isRunning)}
          onStep={stepOnce}
          onClear={clearField}
          onRandomize={() => randomizeField()}
          randomizeLabel="Random field"
        />

        {/* Shared speed slider */}
        <SpeedSlider value={intervalMs} onChange={handleSpeedChange} />

        {/* Shared grid size control */}
        <GridSizeControl
          width={gridWidth}
          height={gridHeight}
          disabled={isRunning}
          onApply={handleApplySize}
        />

        {/* Shared boundary mode selector */}
        <BoundaryModeSelect
          value={boundaryMode}
          onChange={setBoundaryMode}
        />

        {/* Diffusion rate */}
        <div className="mb-3">
          <label className="form-label">
            Diffusion rate:{' '}
            <strong>{diffusionRate.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={0.5}
            step={0.01}
            value={diffusionRate}
            onChange={handleDiffusionChange}
          />
          <small className="text-muted">
            Higher values → faster smoothing of the field. Very high values can make the system
            numerically stiff.
          </small>
        </div>

        {/* Decay rate */}
        <div className="mb-3">
          <label className="form-label">
            Decay rate:{' '}
            <strong>{decayRate.toFixed(3)}</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={0.1}
            step={0.001}
            value={decayRate}
            onChange={handleDecayChange}
          />
          <small className="text-muted">
            Set to zero for pure diffusion; increase slightly to let the field cool down over time.
          </small>
        </div>

        {/* Random field intensity */}
        <div className="mb-2">
          <label className="form-label">
            Random max intensity:{' '}
            <strong>{randomMaxIntensity.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={1}
            step={0.05}
            value={randomMaxIntensity}
            onChange={handleRandomIntensityChange}
          />
          <small className="text-muted">
            Used when seeding the grid via &ldquo;Random field&rdquo; – values are drawn uniformly
            between 0 and this maximum.
          </small>
        </div>
      </div>
    </div>
  );
};

export default DiffusionControl;

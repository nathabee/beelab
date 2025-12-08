// src/components/LifeSimControl.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useLifeSim } from '@context/LifeSimContext';

const LifeSimControl: React.FC = () => { 
  const { state, actions } = useLifeSim();

  const {
    isRunning,
    intervalMs,
    gridWidth,
    gridHeight,
    boundaryMode,
    randomFillDensity,
    selectedPreset,
    generation,
    aliveCount,
  } = state;

  const {
    setRunning,
    stepOnce,
    clearGrid,
    randomizeGrid,
    resizeGrid,
    setSpeed,
    setBoundaryMode,
    setRandomFillDensity,
    applyPreset,
    setSelectedPreset,
  } = actions;

  // Local inputs for grid size so we don't resize on every keystroke
  const [widthInput, setWidthInput] = useState(gridWidth.toString());
  const [heightInput, setHeightInput] = useState(gridHeight.toString());
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    setWidthInput(gridWidth.toString());
  }, [gridWidth]);

  useEffect(() => {
    setHeightInput(gridHeight.toString());
  }, [gridHeight]);

  // Auto-run loop: when isRunning=true, step at intervalMs
  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      stepOnce();
    }, intervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [isRunning, intervalMs, stepOnce]);

  const handleApplySize = () => {
    const w = parseInt(widthInput, 10);
    const h = parseInt(heightInput, 10);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    resizeGrid(w, h);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val)) return;
    setSpeed(val);
  };

  const handleDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val)) return;
    setRandomFillDensity(val);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value || null;
    setSelectedPreset(preset);
    if (preset) applyPreset(preset);
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Controls</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => setShowHelp((v) => !v)}
          >
            {showHelp ? 'Hide help' : 'How to play'}
          </button>
        </div>

        {/* HELP BOX */}
        {showHelp && (
          <div className="alert alert-info small mb-3">
            <strong>How to play:</strong>
            <ol className="mb-1 ps-3">
              <li>
                While paused, <strong>click cells</strong> in the grid or use{' '}
                <strong>Randomize</strong> to create an initial pattern.
              </li>
              <li>
                Press <strong>Play</strong> to let the pattern evolve. Use{' '}
                <strong>Speed</strong> to make it faster or slower.
              </li>
              <li>
                Use <strong>Step</strong> for single generations, and{' '}
                <strong>Clear</strong> or <strong>presets</strong> to try new setups.
              </li>
            </ol>
            <div className="mb-0">
              Tip: you cannot edit cells while the simulation is running.
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
          <div>Alive cells: {aliveCount}</div>
        </div>

        {/* Play / step / reset */}
        <div className="mb-3 d-flex gap-2 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${isRunning ? 'btn-warning' : 'btn-success'}`}
            onClick={() => setRunning(!isRunning)}
          >
            {isRunning ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={stepOnce}
            disabled={isRunning}
          >
            Step
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={clearGrid}
            disabled={isRunning && aliveCount === 0}
          >
            Clear
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => randomizeGrid()}
            disabled={isRunning}
          >
            Randomize
          </button>
        </div>

        {/* Speed */}
        <div className="mb-3">
          <label className="form-label">
            Speed (ms per step): <strong>{intervalMs}</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={50}
            max={1000}
            step={10}
            value={intervalMs}
            onChange={handleSpeedChange}
          />
        </div>

        {/* Grid size */}
        <div className="mb-3">
          <label className="form-label">Grid size (width × height)</label>
          <div className="d-flex gap-2">
            <input
              type="number"
              className="form-control form-control-sm"
              min={5}
              max={200}
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
            />
            <span className="align-self-center">×</span>
            <input
              type="number"
              className="form-control form-control-sm"
              min={5}
              max={200}
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleApplySize}
              disabled={isRunning}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Boundary mode */}
        <div className="mb-3">
          <label className="form-label">Boundary mode</label>
          <select
            className="form-select form-select-sm"
            value={boundaryMode}
            onChange={(e) => setBoundaryMode(e.target.value as 'finite' | 'toroidal')}
          >
            <option value="toroidal">Wrapping (torus)</option>
            <option value="finite">Finite (edges die)</option>
          </select>
        </div>

        {/* Random fill density */}
        <div className="mb-3">
          <label className="form-label">
            Random fill density:{' '}
            <strong>{Math.round(randomFillDensity * 100)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={1}
            step={0.05}
            value={randomFillDensity}
            onChange={handleDensityChange}
          />
        </div>

        {/* Presets */}
        <div className="mb-2">
          <label className="form-label">Preset pattern</label>
          <select
            className="form-select form-select-sm"
            value={selectedPreset ?? ''}
            onChange={handlePresetChange}
          >
            <option value="">– None –</option>
            <option value="glider">Glider</option>
            <option value="small-exploder">Small exploder</option>
            <option value="pulsar">Pulsar</option>
            <option value="random-corner">Random corner</option>
          </select>
          <small className="text-muted">
            Presets are placeholders for now – wire actual patterns into{' '}
            <code>applyPreset</code> later.
          </small>
        </div>
      </div>
    </div>
  );
};

export default LifeSimControl;

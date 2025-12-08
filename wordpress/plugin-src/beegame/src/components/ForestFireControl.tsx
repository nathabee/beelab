// src/components/ForestFireControl.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForestFire } from '@context/ForestFireContext';

const ForestFireControl: React.FC = () => { 
  const { state, actions } = useForestFire();

  const {
    isRunning,
    intervalMs,
    gridWidth,
    gridHeight,
    boundaryMode,
    pGrowth,
    pLightning,
    generation,
    treeCount,
    burningCount,
  } = state;

  const {
    setRunning,
    stepOnce,
    clearGrid,
    randomizeGrid,
    resizeGrid,
    setSpeed,
    setGrowth,
    setLightning,
    setBoundaryMode,
  } = actions;

  const [widthInput, setWidthInput] = useState(gridWidth.toString());
  const [heightInput, setHeightInput] = useState(gridHeight.toString());
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    setWidthInput(gridWidth.toString());
  }, [gridWidth]);

  useEffect(() => {
    setHeightInput(gridHeight.toString());
  }, [gridHeight]);
 

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

  const handleGrowthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val)) return;
    setGrowth(val);
  };

  const handleLightningChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val)) return;
    setLightning(val);
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Forest Controls</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => setShowHelp(v => !v)}
          >
            {showHelp ? 'Hide help' : 'How it works'}
          </button>
        </div>

        {showHelp && (
          <div className="alert alert-info small mb-3">
            <strong>Model:</strong> each cell is empty, tree, or burning.
            <ul className="mb-1 ps-3">
              <li>Burning → becomes empty next step.</li>
              <li>Tree → catches fire if a neighbour burns or by lightning.</li>
              <li>Empty → grows a tree with probability “Growth”.</li>
            </ul>
            <div>Use Randomize to start with a forest, then press Play.</div>
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
          <div>Trees: {treeCount} · Burning: {burningCount}</div>
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
            disabled={isRunning}
          >
            Clear
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={randomizeGrid}
            disabled={isRunning}
          >
            Randomize forest
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
            onChange={(e) =>
              setBoundaryMode(e.target.value as 'finite' | 'toroidal')
            }
          >
            <option value="toroidal">Wrapping (torus)</option>
            <option value="finite">Finite (edges)</option>
          </select>
        </div>

        {/* Growth */}
        <div className="mb-3">
          <label className="form-label">
            Tree growth probability: <strong>{(pGrowth * 100).toFixed(1)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={0.1}
            step={0.002}
            value={pGrowth}
            onChange={handleGrowthChange}
          />
        </div>

        {/* Lightning */}
        <div className="mb-2">
          <label className="form-label">
            Lightning probability:{' '}
            <strong>{(pLightning * 100).toFixed(3)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={0.01}
            step={0.0002}
            value={pLightning}
            onChange={handleLightningChange}
          />
          <small className="text-muted">
            Higher lightning → more frequent random fires.
          </small>
        </div>
      </div>
    </div>
  );
};

export default ForestFireControl;

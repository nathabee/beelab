// src/components/LifeSimControl.tsx
'use client';

import React, { useState } from 'react';
import { useLifeSim } from '@context/LifeSimContext';

import PlayControls from '@components/common/PlayControls';
import SpeedSlider from '@components/common/SpeedSlider';
import GridSizeControl from '@components/common/GridSizeControl';
import BoundaryModeSelect from '@components/common/BoundaryModeSelect';

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

  const [showHelp, setShowHelp] = useState(true);

  const handleApplySize = (w: number, h: number) => {
    resizeGrid(w, h);
  };

  const handleSpeedChange = (val: number) => {
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
        {/* Header   */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Game of Life Controls</h2>
 
        </div>

 

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

        {/* Shared play controls */}
        <PlayControls
          isRunning={isRunning}
          onToggleRun={() => setRunning(!isRunning)}
          onStep={stepOnce}
          onClear={clearGrid}
          onRandomize={() => randomizeGrid()}
          randomizeLabel="Randomize grid"
        />

        {/* Shared speed slider */}
        <SpeedSlider
          value={intervalMs}
          onChange={handleSpeedChange}
        />

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
            disabled={isRunning}
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

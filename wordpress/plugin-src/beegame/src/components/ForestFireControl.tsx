// src/components/ForestFireControl.tsx
'use client';

import React, { useState } from 'react';
import { useForestFire } from '@context/ForestFireContext';
import PlayControls from '@components/common/PlayControls';
import SpeedSlider from '@components/common/SpeedSlider';
import GridSizeControl from '@components/common/GridSizeControl';
import BoundaryModeSelect from '@components/common/BoundaryModeSelect';

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

  const [showHelp, setShowHelp] = useState(true);

  const handleApplySize = (w: number, h: number) => {
    resizeGrid(w, h);
  };

  const handleSpeedChange = (val: number) => {
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
          <div>Trees: {treeCount} · Burning: {burningCount}</div>
        </div>

        {/* Shared play controls */}
        <PlayControls
          isRunning={isRunning}
          onToggleRun={() => setRunning(!isRunning)}
          onStep={stepOnce}
          onClear={clearGrid}
          onRandomize={() => randomizeGrid()}
          randomizeLabel="Randomize forest"
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

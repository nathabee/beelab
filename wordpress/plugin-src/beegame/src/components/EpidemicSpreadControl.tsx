// src/components/EpidemicSpreadControl.tsx
'use client';

import React, { useState } from 'react';
import { useEpidemicSpread } from '@context/EpidemicSpreadContext';

import PlayControls from '@components/common/PlayControls';
import SpeedSlider from '@components/common/SpeedSlider';
import GridSizeControl from '@components/common/GridSizeControl';
import BoundaryModeSelect from '@components/common/BoundaryModeSelect';

const EpidemicSpreadControl: React.FC = () => {
  const { state, actions } = useEpidemicSpread();

  const {
    isRunning,
    intervalMs,
    gridWidth,
    gridHeight,
    boundaryMode,
    pInfection,
    pRecovery,
    pLossImmunity,
    randomInfectedDensity,
    generation,
    susceptibleCount,
    infectedCount,
    recoveredCount,
  } = state;

  const {
    setRunning,
    stepOnce,
    clearGrid,
    randomizeGrid,
    resizeGrid,
    setSpeed,
    setBoundaryMode,
    setInfection,
    setRecovery,
    setLossImmunity,
    setRandomInfectedDensity,
  } = actions;

  const [showHelp, setShowHelp] = useState(true);

  const handleApplySize = (w: number, h: number) => {
    resizeGrid(w, h);
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
  };

  const handleInfectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setInfection(v);
  };

  const handleRecoveryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setRecovery(v);
  };

  const handleLossImmunityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setLossImmunity(v);
  };

  const handleRandomDensityChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setRandomInfectedDensity(v);
  };

  return (
    <div className="card">
      <div className="card-body">
        {/* Header + help toggle */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Epidemic Controls</h2>
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
            <strong>Model:</strong> grid-based SIR.
            <ul className="mb-1 ps-3">
              <li>
                <strong>Susceptible (S)</strong> become infected if neighbours
                are infected (probability = Infection).
              </li>
              <li>
                <strong>Infected (I)</strong> recover each step with probability
                Recovery.
              </li>
              <li>
                <strong>Recovered (R)</strong> are immune; optionally lose
                immunity with Loss of immunity.
              </li>
            </ul>
            <div>
              Use <strong>Random infection</strong> to seed the grid, then press{' '}
              <strong>Play</strong>.
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
            S: {susceptibleCount} · I: {infectedCount} · R: {recoveredCount}
          </div>
        </div>

        {/* Shared play controls */}
        <PlayControls
          isRunning={isRunning}
          onToggleRun={() => setRunning(!isRunning)}
          onStep={stepOnce}
          onClear={clearGrid}
          onRandomize={() => randomizeGrid()}
          randomizeLabel="Random infection"
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

        {/* Infection probability */}
        <div className="mb-3">
          <label className="form-label">
            Infection probability (per step):{' '}
            <strong>{(pInfection * 100).toFixed(1)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={1}
            step={0.01}
            value={pInfection}
            onChange={handleInfectionChange}
          />
        </div>

        {/* Recovery probability */}
        <div className="mb-3">
          <label className="form-label">
            Recovery probability (per step):{' '}
            <strong>{(pRecovery * 100).toFixed(1)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={1}
            step={0.01}
            value={pRecovery}
            onChange={handleRecoveryChange}
          />
        </div>

        {/* Loss of immunity */}
        <div className="mb-3">
          <label className="form-label">
            Loss of immunity probability:{' '}
            <strong>{(pLossImmunity * 100).toFixed(2)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={0.1}
            step={0.001}
            value={pLossImmunity}
            onChange={handleLossImmunityChange}
          />
          <small className="text-muted">
            Set to zero for permanent immunity; increase slightly to model SIRS.
          </small>
        </div>

        {/* Random infection density */}
        <div className="mb-2">
          <label className="form-label">
            Initial infected fraction:{' '}
            <strong>{(randomInfectedDensity * 100).toFixed(1)}%</strong>
          </label>
          <input
            type="range"
            className="form-range"
            min={0}
            max={0.5}
            step={0.01}
            value={randomInfectedDensity}
            onChange={handleRandomDensityChange}
          />
          <small className="text-muted">
            Used when seeding the grid via &ldquo;Random infection&rdquo;.
          </small>
        </div>
      </div>
    </div>
  );
};

export default EpidemicSpreadControl;

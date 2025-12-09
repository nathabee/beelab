// src/components/LogisticMapControl.tsx
'use client';

import React, { useState } from 'react';
import { useLogisticMap } from '@context/LogisticMapContext';

import PlayControls from '@components/common/PlayControls';
import SpeedSlider from '@components/common/SpeedSlider';

const LogisticMapControl: React.FC = () => {
  const { state, actions } = useLogisticMap();

  const {
    r,
    x0,
    points,
    generation,
    isRunning,
    intervalMs,
    maxSteps,
  } = state;

  const {
    resetSeries,
    stepOnce,
    setRunning,
    setR,
    setX0,
    setMaxSteps,
    setSpeed,
    randomizeInitialX0,
  } = actions;

  const [showHelp, setShowHelp] = useState(true);
  const [rInput, setRInput] = useState(r.toString());
  const [x0Input, setX0Input] = useState(x0.toString());
  const [maxStepsInput, setMaxStepsInput] = useState(maxSteps.toString());

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
  };

  const handleRSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setR(v);
    setRInput(v.toString());
  };

  const handleRInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRInput(val);
    const parsed = parseFloat(val);
    if (!Number.isFinite(parsed)) return;
    setR(parsed);
  };

  const handleX0SliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    setX0(v);
    setX0Input(v.toString());
  };

  const handleX0InputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setX0Input(val);
    const parsed = parseFloat(val);
    if (!Number.isFinite(parsed)) return;
    setX0(parsed);
  };

  const handleMaxStepsApply = () => {
    const parsed = parseInt(maxStepsInput, 10);
    if (!Number.isFinite(parsed)) return;
    setMaxSteps(parsed);
  };

  const currentX = points[points.length - 1] ?? x0;

  return (
    <div className="card">
      <div className="card-body">
        {/* Header + help toggle */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Logistic Map Controls</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => setShowHelp(v => !v)}
          >
            {showHelp ? 'Hide help' : 'What is this?'}
          </button>
        </div>

        {/* Help box */}
        {showHelp && (
          <div className="alert alert-info small mb-3">
            <strong>Model:</strong> xₙ₊₁ = r·xₙ(1 − xₙ) with x in [0,1].
            <ul className="mb-1 ps-3">
              <li>For small r, the population converges to a stable value.</li>
              <li>As r increases, you get period-doubling and then chaos.</li>
              <li>
                Try r≈2.8, 3.2, 3.5, 3.9 and watch how the orbit changes.
              </li>
            </ul>
            <div className="mb-0">
              You can change <strong>r</strong>, the initial value x₀, and the
              number of steps plotted.
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
          <div>Steps: {generation}</div>
          <div>Current xₙ ≈ {currentX.toFixed(4)}</div>
        </div>

        {/* Play controls */}
        <PlayControls
          isRunning={isRunning}
          onToggleRun={() => setRunning(!isRunning)}
          onStep={stepOnce}
          onClear={resetSeries}
          onRandomize={randomizeInitialX0}
          randomizeLabel="Random x₀"
        />

        {/* Speed */}
        <SpeedSlider
          value={intervalMs}
          onChange={handleSpeedChange}
        />

        {/* r parameter */}
        <div className="mb-3">
          <label className="form-label">Parameter r (0 – 4)</label>
          <div className="mb-1 d-flex gap-2">
            <input
              type="number"
              className="form-control form-control-sm"
              min={0}
              max={4}
              step={0.001}
              value={rInput}
              onChange={handleRInputChange}
            />
          </div>
          <input
            type="range"
            className="form-range"
            min={0}
            max={4}
            step={0.001}
            value={r}
            onChange={handleRSliderChange}
          />
        </div>

        {/* initial x0 */}
        <div className="mb-3">
          <label className="form-label">Initial value x₀ (0 – 1)</label>
          <div className="mb-1 d-flex gap-2">
            <input
              type="number"
              className="form-control form-control-sm"
              min={0}
              max={1}
              step={0.001}
              value={x0Input}
              onChange={handleX0InputChange}
            />
          </div>
          <input
            type="range"
            className="form-range"
            min={0}
            max={1}
            step={0.001}
            value={x0}
            onChange={handleX0SliderChange}
          />
        </div>

        {/* max steps */}
        <div className="mb-2">
          <label className="form-label">Maximum plotted steps</label>
          <div className="d-flex gap-2">
            <input
              type="number"
              className="form-control form-control-sm"
              min={10}
              max={2000}
              value={maxStepsInput}
              onChange={e => setMaxStepsInput(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleMaxStepsApply}
            >
              Apply
            </button>
          </div>
          <small className="text-muted">
            After reaching this limit, the simulation stops automatically.
          </small>
        </div>
      </div>
    </div>
  );
};

export default LogisticMapControl;

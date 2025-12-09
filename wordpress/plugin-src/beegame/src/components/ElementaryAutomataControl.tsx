// src/components/ElementaryAutomataControl.tsx
'use client';

import React, { useState } from 'react';
import { useElementaryAutomata } from '@context/ElementaryAutomataContext';

import PlayControls from '@components/common/PlayControls';
import SpeedSlider from '@components/common/SpeedSlider';
import BoundaryModeSelect from '@components/common/BoundaryModeSelect';

const ElementaryAutomataControl: React.FC = () => {
  const { state, actions } = useElementaryAutomata();

  const {
    isRunning,
    intervalMs,
    width,
    boundaryMode,
    rule,
    randomFillDensity,
    generation,
    aliveCount,
  } = state;

  const {
    setRunning,
    stepOnce,
    clear,
    randomizeRow,
    resizeWidth,
    setSpeed,
    setBoundaryMode,
    setRule,
    setRandomFillDensity,
  } = actions;

  const [showHelp, setShowHelp] = useState(true);
  const [widthInput, setWidthInput] = useState(width.toString());
  const [ruleInput, setRuleInput] = useState(rule.toString());

  const handleApplyWidth = () => {
    const w = parseInt(widthInput, 10);
    if (!Number.isFinite(w)) return;
    resizeWidth(w);
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
  };

  const handleDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val)) return;
    setRandomFillDensity(val);
  };

  const handleRuleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val)) return;
    setRule(val);
    setRuleInput(val.toString());
  };

  const handleRuleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRuleInput(val);
    const num = parseInt(val, 10);
    if (Number.isFinite(num)) {
      setRule(num);
    }
  };

  const ruleBinary = rule.toString(2).padStart(8, '0');

  return (
    <div className="card">
      <div className="card-body">
        {/* Header + help toggle */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Elementary CA Controls</h2>
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
            <strong>How it works:</strong>
            <ul className="mb-1 ps-3">
              <li>
                This is a <strong>1D elementary cellular automaton</strong> (Wolfram
                rules). Each row is computed from the row above using a rule between 0 and
                255.
              </li>
              <li>
                Only the <strong>bottom row</strong> is editable. Click cells while paused
                or use <strong>Randomize</strong> to set up the initial row.
              </li>
              <li>
                Rule controls which neighbourhood patterns (111, 110, …, 000) become
                alive in the next row.
              </li>
            </ul>
            <div className="mb-0">
              Typical interesting rules: <strong>30</strong>, <strong>90</strong>,{' '}
              <strong>110</strong>, <strong>184</strong>.
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
          <div>Alive in last row: {aliveCount}</div>
        </div>

        {/* Play controls */}
        <PlayControls
          isRunning={isRunning}
          onToggleRun={() => setRunning(!isRunning)}
          onStep={stepOnce}
          onClear={clear}
          onRandomize={() => randomizeRow()}
          randomizeLabel="Randomize initial row"
        />

        {/* Speed */}
        <SpeedSlider
          value={intervalMs}
          onChange={handleSpeedChange}
        />

        {/* Width control */}
        <div className="mb-3">
          <label className="form-label">Row width (cells)</label>
          <div className="d-flex gap-2">
            <input
              type="number"
              className="form-control form-control-sm"
              min={5}
              max={400}
              value={widthInput}
              onChange={e => setWidthInput(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleApplyWidth}
              disabled={isRunning}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Boundary mode */}
        <BoundaryModeSelect
          value={boundaryMode}
          onChange={setBoundaryMode}
        />

        {/* Random fill density */}
        <div className="mb-3">
          <label className="form-label">
            Random initial density:{' '}
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

        {/* Rule selection */}
        <div className="mb-2">
          <label className="form-label">Rule (0–255)</label>
          <div className="d-flex gap-2 align-items-center mb-1">
            <input
              type="number"
              className="form-control form-control-sm"
              min={0}
              max={255}
              value={ruleInput}
              onChange={handleRuleInputChange}
            />
            <input
              type="range"
              className="form-range"
              min={0}
              max={255}
              value={rule}
              onChange={handleRuleSlider}
            />
          </div>
          <div className="small text-muted">
            Binary: <code>{ruleBinary}</code> (bit 7 = pattern 111, bit 0 = 000)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElementaryAutomataControl;

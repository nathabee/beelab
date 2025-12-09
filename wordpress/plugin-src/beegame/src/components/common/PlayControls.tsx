// src/components/common/PlayControls.tsx
'use client';

import React from 'react';

type PlayControlsProps = {
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onClear: () => void;
  onRandomize: () => void;
  randomizeLabel?: string;
};

const PlayControls: React.FC<PlayControlsProps> = ({
  isRunning,
  onToggleRun,
  onStep,
  onClear,
  onRandomize,
  randomizeLabel = 'Randomize',
}) => (
  <div className="mb-3 d-flex gap-2 flex-wrap">
    <button
      type="button"
      className={`btn btn-sm ${isRunning ? 'btn-warning' : 'btn-success'}`}
      onClick={onToggleRun}
    >
      {isRunning ? 'Pause' : 'Play'}
    </button>

    <button
      type="button"
      className="btn btn-sm btn-secondary"
      onClick={onStep}
      disabled={isRunning}
    >
      Step
    </button>

    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={onClear}
      disabled={isRunning}
    >
      Clear
    </button>

    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={onRandomize}
      disabled={isRunning}
    >
      {randomizeLabel}
    </button>
  </div>
);

export default PlayControls;

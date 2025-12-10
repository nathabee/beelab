// src/context/DiffusionContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';

export type BoundaryMode = 'finite' | 'toroidal';

export type DiffusionStatPoint = {
  generation: number;
  min: number;
  max: number;
  avg: number;
};

export interface DiffusionState {
  gridWidth: number;
  gridHeight: number;
  field: number[][];              // values in [0, 1]

  isRunning: boolean;
  intervalMs: number;
  generation: number;

  diffusionRate: number;          // how fast heat spreads
  decayRate: number;              // global cooling
  randomMaxIntensity: number;     // used when randomizing

  boundaryMode: BoundaryMode;

  minValue: number;
  maxValue: number;
  avgValue: number;

  statsHistory: DiffusionStatPoint[];  // NEW: time series for statistics
}

export interface DiffusionActions {
  setCellValue: (x: number, y: number, value: number) => void;
  toggleCell: (x: number, y: number) => void;
  stepOnce: () => void;
  setRunning: (running: boolean) => void;

  clearField: () => void;
  randomizeField: (maxIntensity?: number) => void;

  resizeGrid: (w: number, h: number) => void;
  setSpeed: (ms: number) => void;

  setDiffusionRate: (d: number) => void;
  setDecayRate: (d: number) => void;
  setRandomMaxIntensity: (v: number) => void;

  setBoundaryMode: (mode: BoundaryMode) => void;
}

export interface DiffusionContextValue {
  state: DiffusionState;
  actions: DiffusionActions;
}

const DiffusionContext = createContext<DiffusionContextValue | undefined>(
  undefined,
);

/* helpers */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function createZeroField(w: number, h: number): number[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => 0),
  );
}

function randomField(w: number, h: number, maxIntensity: number): number[][] {
  const max = clamp01(maxIntensity);
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => Math.random() * max),
  );
}

function fieldStats(field: number[][]): {
  min: number;
  max: number;
  avg: number;
} {
  if (!field.length || !field[0].length) {
    return { min: 0, max: 0, avg: 0 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let count = 0;

  for (const row of field) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      count += 1;
    }
  }

  if (count === 0) return { min: 0, max: 0, avg: 0 };
  return { min, max, avg: sum / count };
}

function nextDiffusionStep(
  field: number[][],
  mode: BoundaryMode,
  diffusionRate: number,
  decayRate: number,
): number[][] {
  const H = field.length;
  const W = H ? field[0].length : 0;
  if (!H || !W) return field;

  const d = Math.max(0, Math.min(0.5, diffusionRate));
  const k = Math.max(0, Math.min(1, decayRate));

  const get = (x: number, y: number): number => {
    if (mode === 'toroidal') {
      const xx = (x + W) % W;
      const yy = (y + H) % H;
      return field[yy][xx];
    }
    // finite with "no-flux" behaviour: clamp to edge cell
    const xx = Math.max(0, Math.min(W - 1, x));
    const yy = Math.max(0, Math.min(H - 1, y));
    return field[yy][xx];
  };

  const next = createZeroField(W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = field[y][x];

      // 4-neighbour average (von Neumann)
      const up = get(x, y - 1);
      const down = get(x, y + 1);
      const left = get(x - 1, y);
      const right = get(x + 1, y);

      const neighbourAvg = (up + down + left + right) / 4;

      let nv = v + d * (neighbourAvg - v); // diffusion
      nv -= k * v;                         // decay

      next[y][x] = clamp01(nv);
    }
  }

  return next;
}

/* provider */

const DEFAULT_W = 40;
const DEFAULT_H = 25;

const initialField = createZeroField(DEFAULT_W, DEFAULT_H);
const initialStats = fieldStats(initialField);
const MAX_HISTORY_POINTS = 500;

const initialState: DiffusionState = {
  gridWidth: DEFAULT_W,
  gridHeight: DEFAULT_H,
  field: initialField,

  isRunning: false,
  intervalMs: 200,
  generation: 0,

  diffusionRate: 0.15,
  decayRate: 0.0,
  randomMaxIntensity: 1.0,

  boundaryMode: 'toroidal',

  minValue: initialStats.min,
  maxValue: initialStats.max,
  avgValue: initialStats.avg,

  statsHistory: [
    {
      generation: 0,
      min: initialStats.min,
      max: initialStats.max,
      avg: initialStats.avg,
    },
  ],
};

export const DiffusionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<DiffusionState>(initialState);

  const actions: DiffusionActions = useMemo(
    () => ({
      setCellValue: (x, y, value) => {
        setState(prev => {
          if (
            x < 0 ||
            y < 0 ||
            x >= prev.gridWidth ||
            y >= prev.gridHeight
          ) {
            return prev;
          }
          const field = prev.field.map(row => row.slice());
          field[y][x] = clamp01(value);
          const stats = fieldStats(field);
          // do NOT touch statsHistory here – editing initial condition
          return {
            ...prev,
            field,
            minValue: stats.min,
            maxValue: stats.max,
            avgValue: stats.avg,
          };
        });
      },

      toggleCell: (x, y) => {
        setState(prev => {
          if (
            x < 0 ||
            y < 0 ||
            x >= prev.gridWidth ||
            y >= prev.gridHeight
          ) {
            return prev;
          }
          const field = prev.field.map(row => row.slice());
          const current = field[y][x];
          const next = current > 0.5 ? 0 : 1; // toggle cold/hot
          field[y][x] = next;
          const stats = fieldStats(field);
          // do NOT touch statsHistory here – editing initial condition
          return {
            ...prev,
            field,
            minValue: stats.min,
            maxValue: stats.max,
            avgValue: stats.avg,
          };
        });
      },

      stepOnce: () => {
        setState(prev => {
          const field = nextDiffusionStep(
            prev.field,
            prev.boundaryMode,
            prev.diffusionRate,
            prev.decayRate,
          );
          const stats = fieldStats(field);
          const nextGen = prev.generation + 1;

          const point: DiffusionStatPoint = {
            generation: nextGen,
            min: stats.min,
            max: stats.max,
            avg: stats.avg,
          };

          let statsHistory = [...prev.statsHistory, point];
          if (statsHistory.length > MAX_HISTORY_POINTS) {
            statsHistory = statsHistory.slice(
              statsHistory.length - MAX_HISTORY_POINTS,
            );
          }

          return {
            ...prev,
            field,
            generation: nextGen,
            minValue: stats.min,
            maxValue: stats.max,
            avgValue: stats.avg,
            statsHistory,
          };
        });
      },

      setRunning: (running: boolean) =>
        setState(prev => ({ ...prev, isRunning: running })),

      clearField: () =>
        setState(prev => {
          const field = createZeroField(prev.gridWidth, prev.gridHeight);
          const stats = fieldStats(field);
          const point: DiffusionStatPoint = {
            generation: 0,
            min: stats.min,
            max: stats.max,
            avg: stats.avg,
          };
          return {
            ...prev,
            field,
            generation: 0,
            minValue: stats.min,
            maxValue: stats.max,
            avgValue: stats.avg,
            statsHistory: [point],
          };
        }),

      randomizeField: (maxIntensity?: number) =>
        setState(prev => {
          const mi =
            typeof maxIntensity === 'number'
              ? maxIntensity
              : prev.randomMaxIntensity;
          const field = randomField(prev.gridWidth, prev.gridHeight, mi);
          const stats = fieldStats(field);
          const point: DiffusionStatPoint = {
            generation: 0,
            min: stats.min,
            max: stats.max,
            avg: stats.avg,
          };
          return {
            ...prev,
            field,
            generation: 0,
            randomMaxIntensity: clamp01(mi),
            minValue: stats.min,
            maxValue: stats.max,
            avgValue: stats.avg,
            statsHistory: [point],
          };
        }),

      resizeGrid: (w: number, h: number) =>
        setState(prev => {
          const width = Math.max(5, Math.min(200, w));
          const height = Math.max(5, Math.min(200, h));
          const field = createZeroField(width, height);
          const stats = fieldStats(field);
          const point: DiffusionStatPoint = {
            generation: 0,
            min: stats.min,
            max: stats.max,
            avg: stats.avg,
          };
          return {
            ...prev,
            gridWidth: width,
            gridHeight: height,
            field,
            generation: 0,
            minValue: stats.min,
            maxValue: stats.max,
            avgValue: stats.avg,
            statsHistory: [point],
          };
        }),

      setSpeed: (ms: number) =>
        setState(prev => ({ ...prev, intervalMs: Math.max(20, ms) })),

      setDiffusionRate: (d: number) =>
        setState(prev => ({
          ...prev,
          diffusionRate: Math.max(0, Math.min(0.5, d)),
        })),

      setDecayRate: (d: number) =>
        setState(prev => ({
          ...prev,
          decayRate: Math.max(0, Math.min(1, d)),
        })),

      setRandomMaxIntensity: (v: number) =>
        setState(prev => ({
          ...prev,
          randomMaxIntensity: clamp01(v),
        })),

      setBoundaryMode: (mode: BoundaryMode) =>
        setState(prev => ({ ...prev, boundaryMode: mode })),
    }),
    [],
  );

  // auto-run loop
  useEffect(() => {
    if (!state.isRunning) return;
    const id = window.setInterval(() => {
      actions.stepOnce();
    }, state.intervalMs);
    return () => window.clearInterval(id);
  }, [state.isRunning, state.intervalMs, actions]);

  const value = useMemo(
    () => ({ state, actions }),
    [state, actions],
  );

  return (
    <DiffusionContext.Provider value={value}>
      {children}
    </DiffusionContext.Provider>
  );
};

export const useDiffusion = () => {
  const ctx = useContext(DiffusionContext);
  if (!ctx) {
    throw new Error('useDiffusion must be used within a DiffusionProvider');
  }
  return ctx;
};

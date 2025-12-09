// src/context/LogisticMapContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';

type LogisticMapState = {
  r: number;             // control parameter
  x0: number;            // initial condition
  points: number[];      // x_n sequence
  generation: number;    // number of iterations performed
  isRunning: boolean;
  intervalMs: number;    // ms between steps when auto-running
  maxSteps: number;      // cap for series length
};

type LogisticMapActions = {
  resetSeries: () => void;
  stepOnce: () => void;
  setRunning: (running: boolean) => void;

  setR: (r: number) => void;
  setX0: (x0: number) => void;
  setMaxSteps: (n: number) => void;
  setSpeed: (ms: number) => void;

  randomizeInitialX0: () => void;
};

type LogisticMapContextValue = {
  state: LogisticMapState;
  actions: LogisticMapActions;
};

const LogisticMapContext =
  createContext<LogisticMapContextValue | undefined>(undefined);

const DEFAULT_R = 3.5;
const DEFAULT_X0 = 0.2;
const DEFAULT_INTERVAL_MS = 120;
const DEFAULT_MAX_STEPS = 200;

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function logisticStep(r: number, x: number): number {
  // x_{n+1} = r * x_n * (1 - x_n)
  return r * x * (1 - x);
}

const initialState: LogisticMapState = {
  r: DEFAULT_R,
  x0: DEFAULT_X0,
  points: [DEFAULT_X0],
  generation: 0,
  isRunning: false,
  intervalMs: DEFAULT_INTERVAL_MS,
  maxSteps: DEFAULT_MAX_STEPS,
};

export const LogisticMapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<LogisticMapState>(initialState);

  const actions: LogisticMapActions = useMemo(
    () => ({
      resetSeries: () => {
        setState(prev => ({
          ...prev,
          points: [prev.x0],
          generation: 0,
          isRunning: false,
        }));
      },

      stepOnce: () => {
        setState(prev => {
          const len = prev.points.length;
          if (len >= prev.maxSteps) {
            // reached cap → stop
            return { ...prev, isRunning: false };
          }

          const last = prev.points[len - 1] ?? prev.x0;
          const next = clamp01(logisticStep(prev.r, last));
          const points = prev.points.concat([next]);

          return {
            ...prev,
            points,
            generation: prev.generation + 1,
          };
        });
      },

      setRunning: (running: boolean) => {
        setState(prev => ({ ...prev, isRunning: running }));
      },

      setR: (r: number) => {
        const clamped = Math.max(0, Math.min(4, r));
        setState(prev => ({
          ...prev,
          r: clamped,
        }));
      },

      setX0: (x0: number) => {
        const v = clamp01(x0);
        setState(prev => ({
          ...prev,
          x0: v,
          points: [v],
          generation: 0,
        }));
      },

      setMaxSteps: (n: number) => {
        const v = Math.max(10, Math.min(2000, Math.round(n)));
        setState(prev => {
          const cappedPoints =
            prev.points.length > v
              ? prev.points.slice(prev.points.length - v)
              : prev.points;
          return {
            ...prev,
            maxSteps: v,
            points: cappedPoints,
          };
        });
      },

      setSpeed: (ms: number) => {
        setState(prev => ({
          ...prev,
          intervalMs: Math.max(20, ms),
        }));
      },

      randomizeInitialX0: () => {
        const rnd = Math.random(); // in [0,1)
        setState(prev => ({
          ...prev,
          x0: rnd,
          points: [rnd],
          generation: 0,
          isRunning: false,
        }));
      },
    }),
    [],
  );

  // Auto-run loop
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
    <LogisticMapContext.Provider value={value}>
      {children}
    </LogisticMapContext.Provider>
  );
};

export const useLogisticMap = () => {
  const ctx = useContext(LogisticMapContext);
  if (!ctx) {
    throw new Error('useLogisticMap must be used within a LogisticMapProvider');
  }
  return ctx;
};

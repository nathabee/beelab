// src/context/ElementaryAutomataContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';

export type BoundaryMode = 'finite' | 'toroidal';

export type ElementaryStatPoint = {
  generation: number;
  aliveCount: number;
  aliveFraction: number;
  transitions: number;
  transitionsFraction: number;
};

type ElementaryState = {
  width: number;
  history: boolean[][];    // each row is a generation
  generation: number;
  isRunning: boolean;
  intervalMs: number;
  rule: number;            // 0–255
  boundaryMode: BoundaryMode;
  randomFillDensity: number;
  aliveCount: number;      // alive in last row

  statsHistory: ElementaryStatPoint[];
};

type ElementaryActions = {
  toggleCell: (x: number) => void;
  stepOnce: () => void;
  setRunning: (running: boolean) => void;
  clear: () => void;
  randomizeRow: (density?: number) => void;
  resizeWidth: (width: number) => void;
  setSpeed: (ms: number) => void;
  setBoundaryMode: (mode: BoundaryMode) => void;
  setRule: (rule: number) => void;
  setRandomFillDensity: (density: number) => void;
};

type ElementaryContextValue = {
  state: ElementaryState;
  actions: ElementaryActions;
};

const ElementaryAutomataContext =
  createContext<ElementaryContextValue | undefined>(undefined);

const DEFAULT_WIDTH = 80;
const MAX_HISTORY = 200;
const MAX_STATS_HISTORY = 500;

function createEmptyRow(width: number): boolean[] {
  return Array.from({ length: width }, () => false);
}

function countAlive(row: boolean[]): number {
  return row.reduce((sum, c) => sum + (c ? 1 : 0), 0);
}

function countTransitions(row: boolean[]): number {
  if (row.length <= 1) return 0;
  let t = 0;
  for (let i = 0; i < row.length - 1; i += 1) {
    if (row[i] !== row[i + 1]) t += 1;
  }
  return t;
}

function makeStatPoint(
  generation: number,
  row: boolean[],
): ElementaryStatPoint {
  const aliveCount = countAlive(row);
  const transitions = countTransitions(row);
  const width = row.length || 1;
  const aliveFraction = aliveCount / width;
  const transitionsFraction = transitions / (width - 1 || 1);
  return {
    generation,
    aliveCount,
    aliveFraction,
    transitions,
    transitionsFraction,
  };
}

// Standard Wolfram rule: pattern 111..000 → bits 7..0 of rule.
function nextRowFromRule(
  prev: boolean[],
  rule: number,
  mode: BoundaryMode,
): boolean[] {
  const w = prev.length;

  const get = (x: number): boolean => {
    if (mode === 'toroidal') {
      const xx = (x + w) % w;
      return prev[xx];
    }
    if (x < 0 || x >= w) return false;
    return prev[x];
  };

  const next: boolean[] = new Array(w);

  for (let x = 0; x < w; x += 1) {
    const left = get(x - 1) ? 1 : 0;
    const self = get(x) ? 1 : 0;
    const right = get(x + 1) ? 1 : 0;
    const patternIndex = (left << 2) | (self << 1) | right; // 0–7
    const bit = (rule >> patternIndex) & 1;
    next[x] = bit === 1;
  }

  return next;
}

const initialRow = createEmptyRow(DEFAULT_WIDTH);
const initialStat = makeStatPoint(0, initialRow);

const initialState: ElementaryState = {
  width: DEFAULT_WIDTH,
  history: [initialRow],
  generation: 0,
  isRunning: false,
  intervalMs: 150,
  rule: 110,
  boundaryMode: 'toroidal',
  randomFillDensity: 0.5,
  aliveCount: initialStat.aliveCount,
  statsHistory: [initialStat],
};

export const ElementaryAutomataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ElementaryState>(initialState);

  const actions: ElementaryActions = useMemo(
    () => ({
      toggleCell: (x) => {
        setState(prev => {
          if (prev.history.length === 0) return prev;
          const lastIndex = prev.history.length - 1;
          const lastRow = prev.history[lastIndex].slice();
          if (x < 0 || x >= lastRow.length) return prev;

          // only edit when paused (safety guard here)
          if (prev.isRunning) return prev;

          lastRow[x] = !lastRow[x];
          const aliveCount = countAlive(lastRow);

          const newHistory = prev.history.slice();
          newHistory[lastIndex] = lastRow;

          // we *do not* change statsHistory here: think of this as editing the initial condition

          return {
            ...prev,
            history: newHistory,
            aliveCount,
          };
        });
      },

      stepOnce: () => {
        setState(prev => {
          if (prev.history.length === 0) return prev;
          const lastRow = prev.history[prev.history.length - 1];
          const nextRow = nextRowFromRule(
            lastRow,
            prev.rule,
            prev.boundaryMode,
          );
          const aliveCount = countAlive(nextRow);
          const nextGen = prev.generation + 1;

          let newHistory = prev.history.concat([nextRow]);
          if (newHistory.length > MAX_HISTORY) {
            newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
          }

          const point = makeStatPoint(nextGen, nextRow);
          let statsHistory = [...prev.statsHistory, point];
          if (statsHistory.length > MAX_STATS_HISTORY) {
            statsHistory = statsHistory.slice(
              statsHistory.length - MAX_STATS_HISTORY,
            );
          }

          return {
            ...prev,
            history: newHistory,
            generation: nextGen,
            aliveCount,
            statsHistory,
          };
        });
      },

      setRunning: (running) => {
        setState(prev => ({ ...prev, isRunning: running }));
      },

      clear: () => {
        setState(prev => {
          const row = createEmptyRow(prev.width);
          const point = makeStatPoint(0, row);
          return {
            ...prev,
            history: [row],
            generation: 0,
            aliveCount: point.aliveCount,
            statsHistory: [point],
          };
        });
      },

      randomizeRow: (densityArg) => {
        setState(prev => {
          const density = densityArg ?? prev.randomFillDensity;
          const row = Array.from(
            { length: prev.width },
            () => Math.random() < density,
          );
          const point = makeStatPoint(0, row);
          return {
            ...prev,
            history: [row],
            generation: 0,
            aliveCount: point.aliveCount,
            randomFillDensity: density,
            statsHistory: [point],
          };
        });
      },

      resizeWidth: (width) => {
        setState(prev => {
          const w = Math.max(5, Math.min(400, width));
          const row = createEmptyRow(w);
          const point = makeStatPoint(0, row);
          return {
            ...prev,
            width: w,
            history: [row],
            generation: 0,
            aliveCount: point.aliveCount,
            statsHistory: [point],
          };
        });
      },

      setSpeed: (ms) => {
        setState(prev => ({
          ...prev,
          intervalMs: Math.max(20, ms),
        }));
      },

      setBoundaryMode: (mode) => {
        setState(prev => ({ ...prev, boundaryMode: mode }));
      },

      setRule: (rule) => {
        const clamped = Math.max(0, Math.min(255, Math.round(rule)));
        setState(prev => ({ ...prev, rule: clamped }));
      },

      setRandomFillDensity: (density) => {
        setState(prev => ({
          ...prev,
          randomFillDensity: Math.min(1, Math.max(0, density)),
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

    return () => {
      window.clearInterval(id);
    };
  }, [state.isRunning, state.intervalMs, actions]);

  const value = useMemo(
    () => ({ state, actions }),
    [state, actions],
  );

  return (
    <ElementaryAutomataContext.Provider value={value}>
      {children}
    </ElementaryAutomataContext.Provider>
  );
};

export const useElementaryAutomata = () => {
  const ctx = useContext(ElementaryAutomataContext);
  if (!ctx) {
    throw new Error('useElementaryAutomata must be used within an ElementaryAutomataProvider');
  }
  return ctx;
};

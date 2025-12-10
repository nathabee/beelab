// src/context/EpidemicSpreadContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';

export type BoundaryMode = 'finite' | 'toroidal';

export type EpidemicCell = 0 | 1 | 2;
// 0 = susceptible, 1 = infected, 2 = recovered

export type EpidemicStatPoint = {
  generation: number;
  susceptible: number;
  infected: number;
  recovered: number;
  fracS: number;
  fracI: number;
  fracR: number;
};

export interface EpidemicState {
  gridWidth: number;
  gridHeight: number;
  cells: EpidemicCell[][];

  isRunning: boolean;
  intervalMs: number;
  generation: number;

  pInfection: number;
  pRecovery: number;
  pLossImmunity: number;
  randomInfectedDensity: number;

  boundaryMode: BoundaryMode;

  susceptibleCount: number;
  infectedCount: number;
  recoveredCount: number;

  statsHistory: EpidemicStatPoint[];
}

export interface EpidemicActions {
  toggleCell: (x: number, y: number) => void;
  stepOnce: () => void;
  setRunning: (running: boolean) => void;

  clearGrid: () => void;
  randomizeGrid: (infectedDensity?: number) => void;

  resizeGrid: (w: number, h: number) => void;
  setSpeed: (ms: number) => void;

  setInfection: (p: number) => void;
  setRecovery: (p: number) => void;
  setLossImmunity: (p: number) => void;

  setBoundaryMode: (mode: BoundaryMode) => void;
  setRandomInfectedDensity: (density: number) => void;
}

export interface EpidemicContextValue {
  state: EpidemicState;
  actions: EpidemicActions;
}

const EpidemicSpreadContext = createContext<EpidemicContextValue | undefined>(
  undefined,
);

/* helpers */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function createSusceptibleGrid(w: number, h: number): EpidemicCell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => 0 as EpidemicCell),
  );
}

function randomInfectedGrid(
  w: number,
  h: number,
  infectedDensity: number,
): EpidemicCell[][] {
  const p = clamp01(infectedDensity);
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () =>
      Math.random() < p ? (1 as EpidemicCell) : (0 as EpidemicCell),
    ),
  );
}

function countSIR(cells: EpidemicCell[][]): {
  susceptible: number;
  infected: number;
  recovered: number;
} {
  let s = 0;
  let i = 0;
  let r = 0;
  for (const row of cells) {
    for (const c of row) {
      if (c === 0) s += 1;
      else if (c === 1) i += 1;
      else if (c === 2) r += 1;
    }
  }
  return { susceptible: s, infected: i, recovered: r };
}

function makeStatPoint(
  generation: number,
  counts: { susceptible: number; infected: number; recovered: number },
  totalCells: number,
): EpidemicStatPoint {
  const { susceptible, infected, recovered } = counts;
  const N = totalCells || 1;
  return {
    generation,
    susceptible,
    infected,
    recovered,
    fracS: susceptible / N,
    fracI: infected / N,
    fracR: recovered / N,
  };
}

function nextGeneration(
  cells: EpidemicCell[][],
  mode: BoundaryMode,
  pInfection: number,
  pRecovery: number,
  pLossImmunity: number,
): EpidemicCell[][] {
  const H = cells.length;
  const W = H ? cells[0].length : 0;

  const get = (x: number, y: number): EpidemicCell => {
    if (mode === 'toroidal') {
      const xx = (x + W) % W;
      const yy = (y + H) % H;
      return cells[yy][xx];
    }
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return cells[y][x];
  };

  const next: EpidemicCell[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => 0 as EpidemicCell),
  );

  const pInf = clamp01(pInfection);
  const pRec = clamp01(pRecovery);
  const pLoss = clamp01(pLossImmunity);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = cells[y][x];

      if (cell === 1) {
        // infected: can recover
        if (Math.random() < pRec) {
          next[y][x] = 2; // recovered
        } else {
          next[y][x] = 1; // stay infected
        }
        continue;
      }

      if (cell === 2) {
        // recovered: may lose immunity
        if (pLoss > 0 && Math.random() < pLoss) {
          next[y][x] = 0; // susceptible again
        } else {
          next[y][x] = 2;
        }
        continue;
      }

      // susceptible
      let infectedNeighbour = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (get(x + dx, y + dy) === 1) {
            infectedNeighbour = true;
            break;
          }
        }
        if (infectedNeighbour) break;
      }

      if (infectedNeighbour && Math.random() < pInf) {
        next[y][x] = 1; // becomes infected
      } else {
        next[y][x] = 0; // stays susceptible
      }
    }
  }

  return next;
}

/* provider */

const DEFAULT_W = 40;
const DEFAULT_H = 25;
const MAX_STATS_HISTORY = 500;

const initialCells = createSusceptibleGrid(DEFAULT_W, DEFAULT_H);
const initialCounts = countSIR(initialCells);
const initialStat = makeStatPoint(
  0,
  initialCounts,
  DEFAULT_W * DEFAULT_H,
);

const initialState: EpidemicState = {
  gridWidth: DEFAULT_W,
  gridHeight: DEFAULT_H,
  cells: initialCells,

  isRunning: false,
  intervalMs: 200,
  generation: 0,

  pInfection: 0.25,
  pRecovery: 0.05,
  pLossImmunity: 0.0,
  randomInfectedDensity: 0.02,

  boundaryMode: 'toroidal',

  susceptibleCount: initialCounts.susceptible,
  infectedCount: initialCounts.infected,
  recoveredCount: initialCounts.recovered,

  statsHistory: [initialStat],
};

export const EpidemicSpreadProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<EpidemicState>(initialState);

  const actions: EpidemicActions = useMemo(
    () => ({
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
          const cells = prev.cells.map(row => row.slice());
          // cycle S → I → R → S
          const current = cells[y][x];
          const next: EpidemicCell = current === 0 ? 1 : current === 1 ? 2 : 0;
          cells[y][x] = next;

          const counts = countSIR(cells);
          const total = prev.gridWidth * prev.gridHeight;
          const stat = makeStatPoint(prev.generation, counts, total);

          // When editing manually we do not touch statsHistory (we treat it as initial condition),
          // so we only update the counts in state here.
          return {
            ...prev,
            cells,
            susceptibleCount: counts.susceptible,
            infectedCount: counts.infected,
            recoveredCount: counts.recovered,
            // statsHistory unchanged
          };
        });
      },

      stepOnce: () => {
        setState(prev => {
          const cells = nextGeneration(
            prev.cells,
            prev.boundaryMode,
            prev.pInfection,
            prev.pRecovery,
            prev.pLossImmunity,
          );
          const counts = countSIR(cells);
          const nextGen = prev.generation + 1;
          const total = prev.gridWidth * prev.gridHeight;
          const point = makeStatPoint(nextGen, counts, total);

          let statsHistory = [...prev.statsHistory, point];
          if (statsHistory.length > MAX_STATS_HISTORY) {
            statsHistory = statsHistory.slice(
              statsHistory.length - MAX_STATS_HISTORY,
            );
          }

          return {
            ...prev,
            cells,
            generation: nextGen,
            susceptibleCount: counts.susceptible,
            infectedCount: counts.infected,
            recoveredCount: counts.recovered,
            statsHistory,
          };
        });
      },

      setRunning: (running: boolean) =>
        setState(prev => ({ ...prev, isRunning: running })),

      clearGrid: () =>
        setState(prev => {
          const cells = createSusceptibleGrid(prev.gridWidth, prev.gridHeight);
          const counts = countSIR(cells);
          const total = prev.gridWidth * prev.gridHeight;
          const point = makeStatPoint(0, counts, total);
          return {
            ...prev,
            cells,
            generation: 0,
            susceptibleCount: counts.susceptible,
            infectedCount: counts.infected,
            recoveredCount: counts.recovered,
            statsHistory: [point],
          };
        }),

      randomizeGrid: (infectedDensity?: number) =>
        setState(prev => {
          const density =
            typeof infectedDensity === 'number'
              ? infectedDensity
              : prev.randomInfectedDensity;
          const cells = randomInfectedGrid(
            prev.gridWidth,
            prev.gridHeight,
            density,
          );
          const counts = countSIR(cells);
          const total = prev.gridWidth * prev.gridHeight;
          const point = makeStatPoint(0, counts, total);
          return {
            ...prev,
            cells,
            generation: 0,
            susceptibleCount: counts.susceptible,
            infectedCount: counts.infected,
            recoveredCount: counts.recovered,
            randomInfectedDensity: clamp01(density),
            statsHistory: [point],
          };
        }),

      resizeGrid: (w: number, h: number) =>
        setState(prev => {
          const width = Math.max(5, Math.min(200, w));
          const height = Math.max(5, Math.min(200, h));
          const cells = createSusceptibleGrid(width, height);
          const counts = countSIR(cells);
          const total = width * height;
          const point = makeStatPoint(0, counts, total);
          return {
            ...prev,
            gridWidth: width,
            gridHeight: height,
            cells,
            generation: 0,
            susceptibleCount: counts.susceptible,
            infectedCount: counts.infected,
            recoveredCount: counts.recovered,
            statsHistory: [point],
          };
        }),

      setSpeed: (ms: number) =>
        setState(prev => ({ ...prev, intervalMs: Math.max(20, ms) })),

      setInfection: (p: number) =>
        setState(prev => ({ ...prev, pInfection: clamp01(p) })),

      setRecovery: (p: number) =>
        setState(prev => ({ ...prev, pRecovery: clamp01(p) })),

      setLossImmunity: (p: number) =>
        setState(prev => ({ ...prev, pLossImmunity: clamp01(p) })),

      setBoundaryMode: (mode: BoundaryMode) =>
        setState(prev => ({ ...prev, boundaryMode: mode })),

      setRandomInfectedDensity: (density: number) =>
        setState(prev => ({
          ...prev,
          randomInfectedDensity: clamp01(density),
        })),
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
    <EpidemicSpreadContext.Provider value={value}>
      {children}
    </EpidemicSpreadContext.Provider>
  );
};

export const useEpidemicSpread = () => {
  const ctx = useContext(EpidemicSpreadContext);
  if (!ctx) {
    throw new Error(
      'useEpidemicSpread must be used within an EpidemicSpreadProvider',
    );
  }
  return ctx;
};

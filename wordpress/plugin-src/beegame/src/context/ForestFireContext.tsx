// src/context/ForestFireContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';

export type ForestCell = 0 | 1 | 2;
// 0 = empty, 1 = tree, 2 = burning

// optional alias if you like the other name
export type ForestCellState = ForestCell;

export type BoundaryMode = 'finite' | 'toroidal';

export type ForestFireStatPoint = {
  generation: number;
  treeCount: number;
  burningCount: number;
  emptyCount: number;
  fracTree: number;
  fracBurning: number;
  fracEmpty: number;
};

export interface ForestFireState {
  gridWidth: number;
  gridHeight: number;
  cells: ForestCell[][];

  isRunning: boolean;
  intervalMs: number;
  generation: number;

  pGrowth: number;    // empty -> tree
  pLightning: number; // tree -> burning (lightning)
  pSpread: number;    // burning neighbour spreads fire

  boundaryMode: BoundaryMode;

  treeCount: number;
  burningCount: number;

  statsHistory: ForestFireStatPoint[];
}

export interface ForestFireActions {
  toggleCell: (x: number, y: number) => void;
  stepOnce: () => void;
  setRunning: (running: boolean) => void;

  clearGrid: () => void;
  randomizeGrid: (treeChance?: number) => void;

  resizeGrid: (w: number, h: number) => void;
  setSpeed: (ms: number) => void;

  setGrowth: (p: number) => void;
  setLightning: (p: number) => void;
  setSpread: (p: number) => void;

  setBoundaryMode: (mode: BoundaryMode) => void;
}

export interface ForestFireContextValue {
  state: ForestFireState;
  actions: ForestFireActions;
}

const ForestFireContext = createContext<ForestFireContextValue | undefined>(
  undefined,
);

/* helpers */

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function createEmptyGrid(w: number, h: number): ForestCell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => 0 as ForestCell),
  );
}

function randomGrid(w: number, h: number, treeChance: number): ForestCell[][] {
  const p = clamp01(treeChance);
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () =>
      Math.random() < p ? (1 as ForestCell) : (0 as ForestCell),
    ),
  );
}

function countForest(cells: ForestCell[][]): { trees: number; burning: number } {
  let trees = 0;
  let burning = 0;
  for (const row of cells) {
    for (const c of row) {
      if (c === 1) trees += 1;
      else if (c === 2) burning += 1;
    }
  }
  return { trees, burning };
}

function makeStatPoint(
  generation: number,
  counts: { trees: number; burning: number },
  totalCells: number,
): ForestFireStatPoint {
  const { trees, burning } = counts;
  const N = totalCells || 1;
  const empty = Math.max(0, N - trees - burning);
  return {
    generation,
    treeCount: trees,
    burningCount: burning,
    emptyCount: empty,
    fracTree: trees / N,
    fracBurning: burning / N,
    fracEmpty: empty / N,
  };
}

function nextGeneration(
  cells: ForestCell[][],
  mode: BoundaryMode,
  pGrowth: number,
  pLightning: number,
  pSpread: number,
): ForestCell[][] {
  const H = cells.length;
  const W = H ? cells[0].length : 0;

  const get = (x: number, y: number): ForestCell => {
    if (mode === 'toroidal') {
      const xx = (x + W) % W;
      const yy = (y + H) % H;
      return cells[yy][xx];
    }
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return cells[y][x];
  };

  const next: ForestCell[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => 0 as ForestCell),
  );

  const pG = clamp01(pGrowth);
  const pL = clamp01(pLightning);
  const pS = clamp01(pSpread);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = cells[y][x];

      if (cell === 2) {
        // burning -> empty
        next[y][x] = 0;
        continue;
      }

      if (cell === 1) {
        // tree: can catch from neighbours
        let neighbourBurning = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (get(x + dx, y + dy) === 2) {
              neighbourBurning = true;
              break;
            }
          }
          if (neighbourBurning) break;
        }

        if (neighbourBurning && Math.random() < pS) {
          next[y][x] = 2;
          continue;
        }

        if (Math.random() < pL) {
          next[y][x] = 2;
          continue;
        }

        next[y][x] = 1;
        continue;
      }

      // empty
      if (Math.random() < pG) {
        next[y][x] = 1;
      } else {
        next[y][x] = 0;
      }
    }
  }

  return next;
}

/* provider */

const DEFAULT_W = 40;
const DEFAULT_H = 25;
const MAX_STATS_HISTORY = 500;

const initialCells = createEmptyGrid(DEFAULT_W, DEFAULT_H);
const initialCounts = countForest(initialCells);
const initialStat = makeStatPoint(
  0,
  initialCounts,
  DEFAULT_W * DEFAULT_H,
);

const initialState: ForestFireState = {
  gridWidth: DEFAULT_W,
  gridHeight: DEFAULT_H,
  cells: initialCells,

  isRunning: false,
  intervalMs: 200,
  generation: 0,

  pGrowth: 0.02,
  pLightning: 0.0005,
  pSpread: 1.0,

  boundaryMode: 'toroidal',

  treeCount: initialCounts.trees,
  burningCount: initialCounts.burning,

  statsHistory: [initialStat],
};

export const ForestFireProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ForestFireState>(initialState);

  const actions: ForestFireActions = useMemo(
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
          const current = cells[y][x];
          const next: ForestCell = current === 0 ? 1 : current === 1 ? 2 : 0;
          cells[y][x] = next;
          const counts = countForest(cells);
          // treat manual editing as changing the current configuration;
          // we leave statsHistory untouched until the next step/reset
          return {
            ...prev,
            cells,
            treeCount: counts.trees,
            burningCount: counts.burning,
          };
        });
      },

      stepOnce: () => {
        setState(prev => {
          const cells = nextGeneration(
            prev.cells,
            prev.boundaryMode,
            prev.pGrowth,
            prev.pLightning,
            prev.pSpread,
          );
          const counts = countForest(cells);
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
            treeCount: counts.trees,
            burningCount: counts.burning,
            statsHistory,
          };
        });
      },

      setRunning: (running: boolean) =>
        setState(prev => ({ ...prev, isRunning: running })),

      clearGrid: () =>
        setState(prev => {
          const cells = createEmptyGrid(prev.gridWidth, prev.gridHeight);
          const counts = countForest(cells);
          const total = prev.gridWidth * prev.gridHeight;
          const point = makeStatPoint(0, counts, total);
          return {
            ...prev,
            cells,
            generation: 0,
            treeCount: counts.trees,
            burningCount: counts.burning,
            statsHistory: [point],
          };
        }),

      randomizeGrid: (treeChance = 0.6) =>
        setState(prev => {
          const cells = randomGrid(prev.gridWidth, prev.gridHeight, treeChance);
          const counts = countForest(cells);
          const total = prev.gridWidth * prev.gridHeight;
          const point = makeStatPoint(0, counts, total);
          return {
            ...prev,
            cells,
            generation: 0,
            treeCount: counts.trees,
            burningCount: counts.burning,
            statsHistory: [point],
          };
        }),

      resizeGrid: (w: number, h: number) =>
        setState(prev => {
          const width = Math.max(5, Math.min(200, w));
          const height = Math.max(5, Math.min(200, h));
          const cells = createEmptyGrid(width, height);
          const counts = countForest(cells);
          const total = width * height;
          const point = makeStatPoint(0, counts, total);
          return {
            ...prev,
            gridWidth: width,
            gridHeight: height,
            cells,
            generation: 0,
            treeCount: counts.trees,
            burningCount: counts.burning,
            statsHistory: [point],
          };
        }),

      setSpeed: (ms: number) =>
        setState(prev => ({ ...prev, intervalMs: Math.max(20, ms) })),

      setGrowth: (p: number) =>
        setState(prev => ({ ...prev, pGrowth: clamp01(p) })),

      setLightning: (p: number) =>
        setState(prev => ({ ...prev, pLightning: clamp01(p) })),

      setSpread: (p: number) =>
        setState(prev => ({ ...prev, pSpread: clamp01(p) })),

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
    <ForestFireContext.Provider value={value}>
      {children}
    </ForestFireContext.Provider>
  );
};

export const useForestFire = () => {
  const ctx = useContext(ForestFireContext);
  if (!ctx) {
    throw new Error('useForestFire must be used within a ForestFireProvider');
  }
  return ctx;
};

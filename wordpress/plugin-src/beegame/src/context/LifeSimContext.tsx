// src/context/LifeSimContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
} from 'react';

type BoundaryMode = 'finite' | 'toroidal';

type LifeSimState = {
  gridWidth: number;
  gridHeight: number;
  cells: boolean[][];
  isRunning: boolean;
  intervalMs: number;
  generation: number;
  aliveCount: number;
  boundaryMode: BoundaryMode;
  randomFillDensity: number;
  selectedPreset: string | null;
};

type LifeSimActions = {
  toggleCell: (x: number, y: number) => void;
  stepOnce: () => void;
  setRunning: (running: boolean) => void;
  clearGrid: () => void;
  randomizeGrid: (density?: number) => void;
  resizeGrid: (width: number, height: number) => void;
  setSpeed: (ms: number) => void;
  setBoundaryMode: (mode: BoundaryMode) => void;
  setRandomFillDensity: (density: number) => void;
  setSelectedPreset: (preset: string | null) => void;
  applyPreset: (preset: string) => void;
};

type LifeSimContextValue = {
  state: LifeSimState;
  actions: LifeSimActions;
};

const LifeSimContext = createContext<LifeSimContextValue | undefined>(undefined);

function createEmptyGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );
}

function countAlive(cells: boolean[][]): number {
  return cells.reduce(
    (sum, row) => sum + row.reduce((rSum, cell) => rSum + (cell ? 1 : 0), 0),
    0,
  );
}

function nextGeneration(cells: boolean[][], mode: BoundaryMode): boolean[][] {
  const h = cells.length;
  const w = h ? cells[0].length : 0;

  const get = (x: number, y: number): boolean => {
    if (mode === 'toroidal') {
      const xx = (x + w) % w;
      const yy = (y + h) % h;
      return cells[yy][xx];
    }
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return cells[y][x];
  };

  const next: boolean[][] = [];
  for (let y = 0; y < h; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < w; x += 1) {
      let neighbours = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          if (get(x + dx, y + dy)) neighbours += 1;
        }
      }

      const alive = cells[y][x];
      let nextAlive = alive;

      if (alive) {
        nextAlive = neighbours === 2 || neighbours === 3;
      } else {
        nextAlive = neighbours === 3;
      }

      row.push(nextAlive);
    }
    next.push(row);
  }

  return next;
}

const DEFAULT_W = 40;
const DEFAULT_H = 25;

const initialState: LifeSimState = {
  gridWidth: DEFAULT_W,
  gridHeight: DEFAULT_H,
  cells: createEmptyGrid(DEFAULT_W, DEFAULT_H),
  isRunning: false,
  intervalMs: 200,
  generation: 0,
  aliveCount: 0,
  boundaryMode: 'toroidal',
  randomFillDensity: 0.3,
  selectedPreset: null,
};

export const LifeSimProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LifeSimState>(initialState);

  const actions: LifeSimActions = useMemo(
    () => ({
      toggleCell: (x, y) => {
        setState(prev => {
          if (y < 0 || y >= prev.gridHeight || x < 0 || x >= prev.gridWidth) {
            return prev;
          }
          const cells = prev.cells.map(row => row.slice());
          cells[y][x] = !cells[y][x];
          const aliveCount = countAlive(cells);
          return { ...prev, cells, aliveCount };
        });
      },

      stepOnce: () => {
        setState(prev => {
          const cells = nextGeneration(prev.cells, prev.boundaryMode);
          const aliveCount = countAlive(cells);
          return {
            ...prev,
            cells,
            generation: prev.generation + 1,
            aliveCount,
          };
        });
      },

      setRunning: (running) => {
        setState(prev => ({ ...prev, isRunning: running }));
      },

      clearGrid: () => {
        setState(prev => {
          const cells = createEmptyGrid(prev.gridWidth, prev.gridHeight);
          return { ...prev, cells, generation: 0, aliveCount: 0 };
        });
      },

      randomizeGrid: (densityArg) => {
        setState(prev => {
          const density = densityArg ?? prev.randomFillDensity;
          const cells = Array.from({ length: prev.gridHeight }, () =>
            Array.from({ length: prev.gridWidth }, () => Math.random() < density),
          );
          const aliveCount = countAlive(cells);
          return {
            ...prev,
            cells,
            generation: 0,
            aliveCount,
            randomFillDensity: density,
          };
        });
      },

      resizeGrid: (width, height) => {
        setState(prev => {
          const w = Math.max(5, Math.min(200, width));
          const h = Math.max(5, Math.min(200, height));
          const cells = createEmptyGrid(w, h);
          return {
            ...prev,
            gridWidth: w,
            gridHeight: h,
            cells,
            generation: 0,
            aliveCount: 0,
          };
        });
      },

      setSpeed: (ms) => {
        setState(prev => ({ ...prev, intervalMs: Math.max(20, ms) }));
      },

      setBoundaryMode: (mode) => {
        setState(prev => ({ ...prev, boundaryMode: mode }));
      },

      setRandomFillDensity: (density) => {
        setState(prev => ({
          ...prev,
          randomFillDensity: Math.min(1, Math.max(0, density)),
        }));
      },

      setSelectedPreset: (preset) => {
        setState(prev => ({ ...prev, selectedPreset: preset }));
      },

      applyPreset: (preset) => {
        // TODO: actual patterns
        setState(prev => ({ ...prev, selectedPreset: preset }));
      },
    }),
    [],
  );

  const value = useMemo(
    () => ({ state, actions }),
    [state, actions],
  );

  return (
    <LifeSimContext.Provider value={value}>
      {children}
    </LifeSimContext.Provider>
  );
};

export const useLifeSim = () => {
  const ctx = useContext(LifeSimContext);
  if (!ctx) throw new Error('useLifeSim must be used within a LifeSimProvider');
  return ctx;
};

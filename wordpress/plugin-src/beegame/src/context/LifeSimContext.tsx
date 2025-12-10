// src/context/LifeSimContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';

type BoundaryMode = 'finite' | 'toroidal';

export type LifeStatPoint = {
  generation: number;
  aliveCount: number;
  births: number;
  deaths: number;
};

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
  statsHistory: LifeStatPoint[];   // NEW
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

function buildPresetCells(
  preset: string,
  width: number,
  height: number,
  density: number,
): boolean[][] {
  const cells = createEmptyGrid(width, height);

  const placePattern = (pattern: Array<[number, number]>, pw: number, ph: number) => {
    if (width < pw || height < ph) {
      // grid too small → just return empty
      return;
    }
    const offsetX = Math.floor((width - pw) / 2);
    const offsetY = Math.floor((height - ph) / 2);

    for (const [px, py] of pattern) {
      const x = offsetX + px;
      const y = offsetY + py;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        cells[y][x] = true;
      }
    }
  };

  switch (preset) {
    case 'glider': {
      const pattern: Array<[number, number]> = [
        [1, 0],
        [2, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ];
      placePattern(pattern, 3, 3);
      break;
    }

    case 'small-exploder': {
      const pattern: Array<[number, number]> = [
        [2, 0],
        [1, 1],
        [2, 1],
        [3, 1],
        [1, 2],
        [3, 2],
        [2, 3],
      ];
      placePattern(pattern, 5, 5);
      break;
    }

    case 'pulsar': {
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);

      const armLen = Math.min(4, Math.floor(Math.min(width, height) / 4));

      if (armLen >= 2) {
        for (let dy = -armLen; dy <= armLen; dy++) {
          const y = cy + dy;
          if (y >= 0 && y < height) {
            cells[y][cx] = true;
          }
        }

        for (let dx = -armLen; dx <= armLen; dx++) {
          const x = cx + dx;
          if (x >= 0 && x < width) {
            cells[cy][x] = true;
          }
        }
      }
      break;
    }

    case 'random-corner': {
      const cornerW = Math.max(3, Math.floor(width / 2));
      const cornerH = Math.max(3, Math.floor(height / 2));
      for (let y = 0; y < cornerH; y += 1) {
        for (let x = 0; x < cornerW; x += 1) {
          cells[y][x] = Math.random() < density;
        }
      }
      break;
    }

    default:
      break;
  }

  return cells;
}

const DEFAULT_W = 40;
const DEFAULT_H = 25;
const MAX_HISTORY_POINTS = 500;

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
  statsHistory: [],      // NEW
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
          // we do NOT touch statsHistory here – editing while paused doesn’t reset experiment
          return { ...prev, cells, aliveCount };
        });
      },

      stepOnce: () => {
        setState(prev => {
          const oldCells = prev.cells;
          const newCells = nextGeneration(oldCells, prev.boundaryMode);

          const h = newCells.length;
          const w = h ? newCells[0].length : 0;

          let births = 0;
          let deaths = 0;
          let aliveCount = 0;

          for (let y = 0; y < h; y += 1) {
            for (let x = 0; x < w; x += 1) {
              const wasAlive = oldCells[y][x];
              const isAlive = newCells[y][x];
              if (!wasAlive && isAlive) births += 1;
              if (wasAlive && !isAlive) deaths += 1;
              if (isAlive) aliveCount += 1;
            }
          }

          const nextGen = prev.generation + 1;
          const nextPoint: LifeStatPoint = {
            generation: nextGen,
            aliveCount,
            births,
            deaths,
          };

          let nextHistory = [...prev.statsHistory, nextPoint];
          if (nextHistory.length > MAX_HISTORY_POINTS) {
            nextHistory = nextHistory.slice(nextHistory.length - MAX_HISTORY_POINTS);
          }

          return {
            ...prev,
            cells: newCells,
            generation: nextGen,
            aliveCount,
            statsHistory: nextHistory,
          };
        });
      },

      setRunning: (running) => {
        setState(prev => ({ ...prev, isRunning: running }));
      },

      clearGrid: () => {
        setState(prev => {
          const cells = createEmptyGrid(prev.gridWidth, prev.gridHeight);
          return {
            ...prev,
            cells,
            generation: 0,
            aliveCount: 0,
            statsHistory: [], // reset stats
          };
        });
      },

      randomizeGrid: (densityArg) => {
        setState(prev => {
          const density = densityArg ?? prev.randomFillDensity;
          const cells = Array.from({ length: prev.gridHeight }, () =>
            Array.from({ length: prev.gridWidth }, () => Math.random() < density),
          );
          const aliveCount = countAlive(cells);
          const initialPoint: LifeStatPoint = {
            generation: 0,
            aliveCount,
            births: 0,
            deaths: 0,
          };
          return {
            ...prev,
            cells,
            generation: 0,
            aliveCount,
            randomFillDensity: density,
            statsHistory: [initialPoint],
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
            statsHistory: [], // new experiment
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
        setState(prev => {
          const cells = buildPresetCells(
            preset,
            prev.gridWidth,
            prev.gridHeight,
            prev.randomFillDensity,
          );
          const aliveCount = countAlive(cells);
          const initialPoint: LifeStatPoint = {
            generation: 0,
            aliveCount,
            births: 0,
            deaths: 0,
          };
          return {
            ...prev,
            cells,
            generation: 0,
            aliveCount,
            selectedPreset: preset,
            statsHistory: [initialPoint],
          };
        });
      },
    }),
    [],
  );

  // Autorun loop: when isRunning = true, step at intervalMs
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

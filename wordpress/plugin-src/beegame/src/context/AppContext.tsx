// src/context/AppContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';

interface AppContextType {
  reset: () => void;
  activeGame: 'lifeSim' | 'forestFire' | null;
  setActiveGame: (game: 'lifeSim' | 'forestFire' | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeGame, setActiveGameInternal] =
    React.useState<'lifeSim' | 'forestFire' | null>(null);

  const setActiveGame = useCallback(
    (game: 'lifeSim' | 'forestFire' | null) => {
      setActiveGameInternal(game);
    },
    [],
  );

  const reset = useCallback(() => {
    // later you can notify all game contexts via events, or just let pages handle it
    console.log('App reset (no per-game state here).');
  }, []);

  const value = useMemo(
    () => ({
      reset,
      activeGame,
      setActiveGame,
    }),
    [reset, activeGame, setActiveGame],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};

import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'vectis';

export interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeCtx = createContext<ThemeContextValue>({ mode: 'vectis', setMode: () => {} });

export const useThemeMode = () => useContext(ThemeCtx);

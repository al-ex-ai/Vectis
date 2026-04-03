import { useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { makeVectisTheme } from '@theme/vectis-theme';
import { ThemeCtx, type ThemeMode } from '@theme/useThemeMode';


function getInitialMode(): ThemeMode {
  const cookie = document.cookie.match(/vectis-theme=([^;]+)/);
  if (cookie) {
    const val = cookie[1];
    if (val === 'light' || val === 'dark' || val === 'vectis') return val;
  }
  return 'vectis';
}

function makeStandardTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: { mode },
    typography: {
      fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      button: { textTransform: 'none' as const },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 8, whiteSpace: 'nowrap', fontSize: '0.78rem', padding: '5px 14px' },
          startIcon: { marginRight: 4, '& > *:nth-of-type(1)': { fontSize: '16px !important' } },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 14, backgroundImage: 'none' } },
      },
      MuiDialog: {
        defaultProps: { disableRestoreFocus: true },
        styleOverrides: { paper: { borderRadius: 16 } },
      },
    },
  });
}

export default function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    document.cookie = `vectis-theme=${next};path=/;max-age=31536000;SameSite=Lax`;
    if (next === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  const theme = useMemo(() => {
    if (mode === 'vectis') return makeVectisTheme('dark');
    return makeStandardTheme(mode);
  }, [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}

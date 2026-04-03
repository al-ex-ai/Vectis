import { createTheme } from '@mui/material';

type Mode = 'light' | 'dark';

export const makeVectisTheme = (mode: Mode) => {
  const isDark = mode === 'dark';

  // Vectis brand: teal/emerald primary, warm amber secondary
  return createTheme({
    palette: {
      mode,
      primary: isDark
        ? { main: '#14b8a6', light: '#2dd4bf', dark: '#0d9488' }
        : { main: '#0d9488', light: '#14b8a6', dark: '#0f766e' },
      secondary: isDark ? { main: '#f59e0b' } : { main: '#d97706' },
      success: isDark ? { main: '#22c55e' } : { main: '#16a34a' },
      error: isDark ? { main: '#f43f5e' } : { main: '#e11d48' },
      warning: isDark ? { main: '#f59e0b' } : { main: '#d97706' },
      info: isDark ? { main: '#38bdf8' } : { main: '#0ea5e9' },
      divider: isDark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.07)',
      background: isDark
        ? { default: '#0c1222', paper: '#131d2e' }
        : { default: '#f8fafb', paper: '#ffffff' },
      text: isDark
        ? { primary: '#e2e8f0', secondary: '#94a3b8', disabled: '#475569' }
        : { primary: '#0f172a', secondary: '#475569', disabled: '#94a3b8' },
      action: {
        hover: isDark ? 'rgba(20, 184, 166, 0.08)' : 'rgba(13, 148, 136, 0.04)',
        selected: isDark ? 'rgba(20, 184, 166, 0.14)' : 'rgba(13, 148, 136, 0.08)',
      },
    },
    typography: {
      fontFamily:
        '"DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
      button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0.01em' },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#2a3a4e transparent' : '#cbd5e1 transparent',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundImage: 'none',
            border: isDark
              ? '1px solid rgba(148, 163, 184, 0.10)'
              : '1px solid rgba(15, 23, 42, 0.07)',
            boxShadow: isDark
              ? 'none'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
          },
        },
      },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            fontSize: '0.78rem',
            padding: '5px 14px',
          },
          startIcon: {
            marginRight: 4,
            '& > *:nth-of-type(1)': { fontSize: '16px !important' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500 },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small', variant: 'outlined' as const },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': { borderRadius: 8 },
          },
        },
      },
      MuiDialog: {
        defaultProps: {
          disableRestoreFocus: true,
        },
        styleOverrides: {
          paper: { borderRadius: 16 },
          root: {
            '& .MuiBackdrop-root': { backdropFilter: 'blur(6px)' },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: isDark ? '#131d2e' : '#ffffff' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: '0.75rem',
            backgroundColor: isDark ? '#1e293b' : '#0f172a',
            color: '#f1f5f9',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: 14, backgroundImage: 'none' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child td, &:last-child th': { borderBottom: 0 },
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(20, 184, 166, 0.06)'
                : 'rgba(13, 148, 136, 0.03)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: isDark
              ? 'rgba(148, 163, 184, 0.10)'
              : 'rgba(15, 23, 42, 0.07)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: isDark
              ? '1px solid rgba(148, 163, 184, 0.10)'
              : '1px solid rgba(15, 23, 42, 0.07)',
          },
        },
      },
    },
  });
};

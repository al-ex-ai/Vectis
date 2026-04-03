// ── Shared Theme Constants ───────────────────────────────────────────
// Single source of truth for status, schema, and canvas colors.

// ── Status Colors (pipeline/flow run status) ────────────────────────

interface StatusColorEntry {
  bg: string;
  border: string;
  glow: string;
  text: string;
}

const STATUS_COLORS_DARK: Record<string, StatusColorEntry> = {
  pending: { bg: '#1a1a2e', border: '#444', glow: 'none', text: '#999' },
  running: { bg: '#0a1929', border: '#1976d2', glow: '0 0 20px rgba(25,118,210,0.4)', text: '#64b5f6' },
  completed: { bg: '#0d2818', border: '#2e7d32', glow: '0 0 12px rgba(46,125,50,0.3)', text: '#81c784' },
  failed: { bg: '#2e0d0d', border: '#c62828', glow: '0 0 12px rgba(198,40,40,0.3)', text: '#ef9a9a' },
  skipped: { bg: '#1a1a1a', border: '#555', glow: 'none', text: '#999' },
  cancelled: { bg: '#1a1a1a', border: '#555', glow: 'none', text: '#999' },
};

const STATUS_COLORS_LIGHT: Record<string, StatusColorEntry> = {
  pending: { bg: '#f5f5f8', border: '#bbb', glow: 'none', text: '#666' },
  running: { bg: '#e3f2fd', border: '#1976d2', glow: '0 0 16px rgba(25,118,210,0.25)', text: '#1565c0' },
  completed: { bg: '#e8f5e9', border: '#2e7d32', glow: '0 0 12px rgba(46,125,50,0.2)', text: '#1b5e20' },
  failed: { bg: '#fbe9e7', border: '#c62828', glow: '0 0 12px rgba(198,40,40,0.2)', text: '#b71c1c' },
  skipped: { bg: '#f5f5f5', border: '#ccc', glow: 'none', text: '#999' },
  cancelled: { bg: '#f5f5f5', border: '#ccc', glow: 'none', text: '#999' },
};

export const STATUS_COLORS = { dark: STATUS_COLORS_DARK, light: STATUS_COLORS_LIGHT } as const;

export function getStatusColor(status: string, isDark: boolean): StatusColorEntry {
  const palette = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  return palette[status] ?? palette.pending;
}

// ── Semantic status hex (for chips, inline indicators) ──────────────

export const STATUS_HEX = {
  completed: '#4caf50',
  failed: '#f44336',
  running: '#1976d2',
  pending: '#666',
  skipped: '#666',
  cancelled: '#666',
} as const;

export function statusHex(status: string): string {
  if (status === 'completed') return STATUS_HEX.completed;
  if (status === 'failed' || status === 'completed_with_errors') return STATUS_HEX.failed;
  if (status === 'running') return STATUS_HEX.running;
  return STATUS_HEX.pending;
}

// ── Canvas Colors (ReactFlow backgrounds) ───────────────────────────

interface CanvasColorEntry {
  background: string;
  grid: string;
  minimapBg: string;
  minimapMask: string;
  dotSize: number;
  dotGap: number;
}

const CANVAS_DARK: CanvasColorEntry = {
  background: '#121212',
  grid: 'rgba(255, 255, 255, 0.06)',
  minimapBg: '#1e1e1e',
  minimapMask: 'rgba(0,0,0,0.7)',
  dotSize: 1,
  dotGap: 24,
};

const CANVAS_LIGHT: CanvasColorEntry = {
  background: '#f8fafb',
  grid: 'rgba(0, 0, 0, 0.05)',
  minimapBg: '#f0f2f4',
  minimapMask: 'rgba(255,255,255,0.7)',
  dotSize: 1,
  dotGap: 24,
};

const CANVAS_VECTIS: CanvasColorEntry = {
  background: '#0c1222',
  grid: 'rgba(20, 184, 166, 0.05)',
  minimapBg: '#0c1222',
  minimapMask: 'rgba(0,0,0,0.7)',
  dotSize: 1,
  dotGap: 24,
};

export const CANVAS_COLORS = { dark: CANVAS_DARK, light: CANVAS_LIGHT, vectis: CANVAS_VECTIS } as const;

export type ThemeKey = 'light' | 'dark' | 'vectis';

export function getCanvasColors(theme: ThemeKey): CanvasColorEntry {
  return CANVAS_COLORS[theme] ?? CANVAS_VECTIS;
}

// ── Schema Colors (database schema grouping) ────────────────────────

interface SchemaColorEntry {
  bg: string;
  border: string;
  text: string;
  accent: string;
}

const SCHEMA_COLORS_DARK: Record<string, SchemaColorEntry> = {
  config:  { bg: '#0d2818', border: '#2e7d32', text: '#81c784', accent: '#4caf50' },
  crm:     { bg: '#0d1b2a', border: '#1565c0', text: '#64b5f6', accent: '#2196f3' },
  orders:  { bg: '#1a0d2e', border: '#7b1fa2', text: '#ce93d8', accent: '#9c27b0' },
  billing: { bg: '#2e1a00', border: '#e65100', text: '#ffb74d', accent: '#ff9800' },
  lookup:  { bg: '#1a1a1a', border: '#546e7a', text: '#90a4ae', accent: '#607d8b' },
  dbo:     { bg: '#1a1a1a', border: '#424242', text: '#9e9e9e', accent: '#757575' },
};

const SCHEMA_COLORS_LIGHT: Record<string, SchemaColorEntry> = {
  config:  { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32', accent: '#4caf50' },
  crm:     { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0', accent: '#2196f3' },
  orders:  { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2', accent: '#9c27b0' },
  billing: { bg: '#fff3e0', border: '#ff9800', text: '#e65100', accent: '#ff9800' },
  lookup:  { bg: '#eceff1', border: '#78909c', text: '#546e7a', accent: '#607d8b' },
  dbo:     { bg: '#f5f5f5', border: '#9e9e9e', text: '#616161', accent: '#757575' },
};

export function getSchemaColor(schema: string, isDark: boolean): SchemaColorEntry {
  const palette = isDark ? SCHEMA_COLORS_DARK : SCHEMA_COLORS_LIGHT;
  return palette[schema] ?? palette.dbo;
}

import type { SxProps, Theme } from '@mui/material';

export const pageWrapper: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

export const loadingContainer: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  py: 8,
};

export const progressBar: SxProps<Theme> = {
  height: 8,
  borderRadius: 4,
  bgcolor: 'action.hover',
  '& .MuiLinearProgress-bar': { borderRadius: 4 },
};

export const statCard: SxProps<Theme> = {
  p: 2,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'transparent',
};

export const statOverline: SxProps<Theme> = {
  color: 'text.disabled',
  lineHeight: 1.5,
};

export const errorCard: SxProps<Theme> = {
  mb: 2,
  p: 2,
  borderLeft: 4,
  borderColor: 'error.main',
};

export const errorMessage: SxProps<Theme> = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'monospace',
  mt: 0.5,
  color: 'text.secondary',
};

export const logCard: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const logHeader: SxProps<Theme> = {
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: 'text.disabled',
  fontWeight: 700,
};

export const tableHeaderCell: SxProps<Theme> = {
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: 'text.disabled',
  fontWeight: 700,
  fontSize: '0.7rem',
};

export const durationChip: SxProps<Theme> = {
  fontWeight: 600,
  fontSize: '0.7rem',
};

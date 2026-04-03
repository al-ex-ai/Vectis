import type { SxProps, Theme } from '@mui/material';

export const pageWrapper: SxProps<Theme> = {
  height: '100%',
  overflow: 'auto',
};

export const loadingContainer: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  mt: 8,
};

export const statCard: SxProps<Theme> = {
  cursor: 'pointer',
  border: '1px solid',
  borderColor: 'divider',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
};

export const statAvatar = (paletteBg: string, palette: string): SxProps<Theme> => ({
  width: 40,
  height: 40,
  bgcolor: paletteBg,
  color: `${palette}.main`,
});

export const statLabel: SxProps<Theme> = {
  textTransform: 'uppercase',
  letterSpacing: 1,
  mt: 0.25,
};

export const emptyState: SxProps<Theme> = {
  py: 6,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
};

export const runListWrapper: SxProps<Theme> = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
};

export const runRow: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr auto', sm: '1fr 90px 80px 150px' },
  alignItems: 'center',
  gap: { xs: 0.75, sm: 1.5 },
  px: { xs: 1.5, sm: 2.5 },
  py: 1.25,
  cursor: 'pointer',
  transition: 'background-color 0.12s',
  '&:hover': { bgcolor: 'action.hover' },
  '&:not(:last-child)': {
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
};

export const runName: SxProps<Theme> = {
  fontWeight: 600,
  fontSize: '0.82rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const statusChip: SxProps<Theme> = {
  borderRadius: 1.5,
  fontWeight: 600,
  fontSize: '0.68rem',
  height: 22,
  width: '100%',
  justifyContent: 'center',
};

export const recordsText: SxProps<Theme> = {
  fontSize: '0.72rem',
  color: 'text.secondary',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  display: { xs: 'none', sm: 'block' },
};

export const timestampText: SxProps<Theme> = {
  fontSize: '0.68rem',
  color: 'text.disabled',
  textAlign: 'right',
  display: { xs: 'none', sm: 'block' },
};

export const progressBar: SxProps<Theme> = {
  mt: 0.5,
  height: 4,
  borderRadius: 2,
  bgcolor: 'action.hover',
};

// kept for back-compat but unused now
export const runListCard = (_idx: number, _total: number): SxProps<Theme> => ({});
export const runCardContent: SxProps<Theme> = {};

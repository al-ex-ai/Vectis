import type { SxProps, Theme } from '@mui/material';

export const pageWrapper: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
};

export const listContainer: SxProps<Theme> = {
  mt: 2,
  display: 'flex',
  flexDirection: 'column',
  gap: 1.5,
};

export const loadingContainer: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  py: 6,
};

export const emptyState: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  py: 8,
};

export const runCard: SxProps<Theme> = {
  cursor: 'pointer',
  border: 1,
  borderColor: 'divider',
  transition: 'box-shadow 0.2s, background-color 0.2s',
  '&:hover': { boxShadow: 3, bgcolor: 'action.hover' },
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
};

export const runCardContent: SxProps<Theme> = {
  py: 1.5,
  '&:last-child': { pb: 1.5 },
};

export const runGrid: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr auto', sm: '180px 1fr 80px 100px 140px 40px' },
  alignItems: 'center',
  gap: { xs: 0.5, sm: 2 },
};

export const progressBar: SxProps<Theme> = {
  height: 6,
  borderRadius: 3,
  bgcolor: 'action.hover',
  '& .MuiLinearProgress-bar': { borderRadius: 3 },
};

export const statusChip: SxProps<Theme> = {
  borderRadius: 1.5,
  fontWeight: 500,
  minWidth: 90,
  justifyContent: 'center',
};

export const paginationBar: SxProps<Theme> = {
  mt: 'auto',
  pt: 3,
  borderTop: '1px solid',
  borderColor: 'divider',
};

export const pageSizeSelect: SxProps<Theme> = {
  minWidth: 70,
  height: 32,
  fontSize: '0.875rem',
};

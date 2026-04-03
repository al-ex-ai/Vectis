import type { SxProps, Theme } from '@mui/material';

/** Centered spinner container — use for page loading states. */
export const loadingContainer: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  mt: 8,
};

/** Standard table wrapper with border. */
export const tableContainer: SxProps<Theme> = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  overflow: 'hidden',
};

/** Centered empty state placeholder. */
export const emptyState: SxProps<Theme> = {
  textAlign: 'center',
  py: 8,
};

/** Standard page header row with title + actions. */
export const pageHeader: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  mb: 3,
  flexWrap: 'wrap',
  gap: 1,
};

export const themedScrollbar: SxProps<Theme> = {
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    bgcolor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
  },
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'rgba(255,255,255,0.15) transparent',
};

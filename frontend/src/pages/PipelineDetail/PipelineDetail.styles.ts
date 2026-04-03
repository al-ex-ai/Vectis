import type { SxProps, Theme } from '@mui/material';

export const pageContainer: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

export const header: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  pb: 2,
  mb: 2,
  flexShrink: 0,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

export const contentArea: SxProps<Theme> = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  gap: 2,
};

export const canvasPaper: SxProps<Theme> = {
  flex: 1,
  position: 'relative',
  minWidth: 0,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'transparent',
};

export const emptyCanvas: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'text.secondary',
};

export const loadingContainer: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  mt: 8,
};

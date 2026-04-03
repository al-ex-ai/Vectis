import type { SxProps, Theme } from '@mui/material';

export { loadingContainer } from '@utils/styles';

export const pageContainer: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

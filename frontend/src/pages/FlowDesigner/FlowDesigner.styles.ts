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
  mt: 8,
};

export const toolbar: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: { xs: 0.5, sm: 1.5 },
  px: { xs: 1, sm: 2 },
  py: 0.75,
  flexShrink: 0,
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

export const sectionLabel: SxProps<Theme> = {
  fontSize: 11,
  fontWeight: 700,
  color: 'text.disabled',
  textTransform: 'uppercase',
  letterSpacing: 1,
  mb: 1,
};

export const toggleGroup: SxProps<Theme> = {
  mb: 2.5,
  '& .MuiToggleButton-root': {
    textTransform: 'none',
    fontSize: 12,
    fontWeight: 600,
  },
};

export const emptyCanvas: SxProps<Theme> = {
  textAlign: 'center',
  mt: 15,
  color: 'text.disabled',
};

export const historyChip = (statusColor: string): SxProps<Theme> => ({
  height: 20,
  fontSize: 10,
  fontWeight: 600,
  bgcolor: statusColor + '22',
  color: statusColor,
});

export const runStatusChip = (bgColor: string, textColor: string): SxProps<Theme> => ({
  height: 24,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'capitalize',
  bgcolor: bgColor + '33',
  color: textColor,
});

export const tagChip: SxProps<Theme> = {
  height: 16,
  fontSize: 9,
  bgcolor: 'action.hover',
};

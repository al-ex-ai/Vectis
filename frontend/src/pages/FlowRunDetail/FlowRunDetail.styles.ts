import type { SxProps, Theme } from '@mui/material';

export const loadingContainer: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  mt: 8,
};

export const statusChip = (status: string, statusHexFn: (s: string) => string): SxProps<Theme> => ({
  fontWeight: 700,
  fontSize: 11,
  bgcolor: statusHexFn(status) + '22',
  color: statusHexFn(status),
});

export const deleteButton: SxProps<Theme> = {
  color: 'text.disabled',
  '&:hover': { color: 'error.main' },
};

export const statsGrid: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 2,
  mb: 3,
};

export const statCard: SxProps<Theme> = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
};

export const statLabel: SxProps<Theme> = {
  fontSize: 11,
  color: 'text.disabled',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

export const stepCard = (isFailed: boolean): SxProps<Theme> => ({
  borderRadius: 2,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: isFailed ? 'error.main' : 'divider',
  overflow: 'hidden',
});

export const stepRow: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 2,
  py: 1.5,
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
};

export const stepTag: SxProps<Theme> = {
  height: 18,
  fontSize: 9,
  fontWeight: 600,
  bgcolor: 'action.hover',
  color: 'text.secondary',
};

export const stepRunChip: SxProps<Theme> = {
  height: 22,
  fontSize: 10,
  cursor: 'pointer',
  bgcolor: 'action.hover',
  color: 'primary.main',
};

export const expandButton = (isExpanded: boolean): SxProps<Theme> => ({
  color: 'text.disabled',
  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
  transition: 'transform 0.2s',
});

export const detailPanel: SxProps<Theme> = {
  px: 2,
  pb: 2,
  pt: 0.5,
  borderTop: '1px solid',
  borderColor: 'divider',
};

export const detailGrid: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 1.5,
  mb: 1.5,
};

export const detailLabel: SxProps<Theme> = {
  fontSize: 10,
  color: 'text.disabled',
  textTransform: 'uppercase',
};

export const transferLogRow = (isLast: boolean, hasClick: boolean): SxProps<Theme> => ({
  py: 0.5,
  borderBottom: isLast ? 'none' : '1px solid',
  borderColor: 'divider',
  cursor: hasClick ? 'pointer' : 'default',
  '&:hover': hasClick ? { bgcolor: 'action.hover' } : {},
});

export const transferLogChip = (status: string, statusHexFn: (s: string) => string): SxProps<Theme> => {
  const resolved = status === 'transferred' || !status ? 'completed' : 'failed';
  return {
    height: 18,
    fontSize: 9,
    bgcolor: statusHexFn(resolved) + '22',
    color: statusHexFn(resolved),
  };
};

export const statusDot = (color: string): SxProps<Theme> => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  bgcolor: color,
  opacity: 0.8,
});

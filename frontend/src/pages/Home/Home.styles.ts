import type { SxProps, Theme } from '@mui/material';

export const page: SxProps<Theme> = {
  height: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
  p: { xs: 1.5, sm: 3 },
  display: 'flex',
  flexDirection: 'column',
  gap: { xs: 1.5, sm: 2.5 },
};

/* ── Top bar ── */

export const topBar: SxProps<Theme> = {
  display: 'flex',
  alignItems: { xs: 'flex-start', sm: 'center' },
  justifyContent: 'space-between',
  flexDirection: { xs: 'column', sm: 'row' },
  gap: 1,
};

export const brand: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
};

export const logoMark = (gradient: string): SxProps<Theme> => ({
  width: { xs: 30, sm: 36 },
  height: { xs: 30, sm: 36 },
  borderRadius: 2.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: gradient,
});

export const brandText: SxProps<Theme> = {
  fontWeight: 800,
  fontSize: { xs: '1rem', sm: '1.25rem' },
  letterSpacing: '-0.03em',
};

export const subtitle: SxProps<Theme> = {
  fontSize: '0.65rem',
  color: 'text.disabled',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

export const statsRow: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  flexWrap: 'wrap',
};

export const statPill = (bgColor: string): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: { xs: 0.75, sm: 1.5 },
  py: 0.4,
  borderRadius: 1.5,
  bgcolor: bgColor,
});

export const statValue: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: { xs: '0.75rem', sm: '0.85rem' },
  color: 'primary.main',
  fontVariantNumeric: 'tabular-nums',
};

export const statLabel: SxProps<Theme> = {
  fontSize: { xs: '0.55rem', sm: '0.65rem' },
  color: 'text.disabled',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600,
};

/* ── Bento grid ── */

export const bentoGrid: SxProps<Theme> = {
  display: 'grid',
  gap: { xs: 1.5, sm: 2 },
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '2fr 1fr' },
  flex: { xs: 'none', md: 1 },
  minWidth: 0,
  maxWidth: '100%',
};

export const bentoCol: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: { xs: 1.5, sm: 2 },
  minWidth: 0,
};

/* ── Section card ── */

export const sectionCard = (isDark: boolean): SxProps<Theme> => ({
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  maxWidth: '100%',
  backdropFilter: isDark ? 'blur(12px)' : 'none',
});

export const sectionHeader: SxProps<Theme> = {
  px: { xs: 1.5, sm: 2.5 },
  pt: { xs: 1.5, sm: 2 },
  pb: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const sectionTitle: SxProps<Theme> = {
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'text.disabled',
};

export const sectionBody: SxProps<Theme> = {
  px: { xs: 1.5, sm: 2.5 },
  pb: { xs: 1.5, sm: 2.5 },
  minWidth: 0,
  overflow: 'hidden',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

/* ── Feature tiles ── */

export const featureGrid: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: { xs: 0.75, sm: 1.5 },
  flex: 1,
};

export const featureTile = (hoverBorder: string): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: { xs: 'center', sm: 'flex-start' },
  textAlign: { xs: 'center', sm: 'left' },
  gap: { xs: 1.25, sm: 1 },
  p: { xs: 1.25, sm: 2 },
  borderRadius: 2.5,
  border: '1px solid',
  borderColor: 'divider',
  transition: 'border-color 0.2s, background-color 0.2s',
  '&:hover': {
    borderColor: hoverBorder,
    bgcolor: 'action.hover',
  },
});

export const featureIconWrap = (bgColor: string): SxProps<Theme> => ({
  width: 30,
  height: 30,
  borderRadius: 1.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: bgColor,
  flexShrink: 0,
});

export const featureTitle: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: '0.8rem',
  lineHeight: 1.3,
};

export const featureDesc: SxProps<Theme> = {
  fontSize: '0.7rem',
  color: 'text.secondary',
  lineHeight: 1.45,
  mt: 0.25,
  wordBreak: 'break-word',
};

/* ── Quick start steps ── */

export const stepsTimeline: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
};

export const stepRow: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1.5,
  position: 'relative',
  pb: 2,
};

export const stepLine: SxProps<Theme> = {
  position: 'absolute',
  left: 15,
  top: 32,
  bottom: 0,
  width: 2,
  bgcolor: 'divider',
};

export const stepNum = (bgColor: string): SxProps<Theme> => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: bgColor,
  color: 'primary.contrastText',
  fontWeight: 700,
  fontSize: '0.75rem',
  flexShrink: 0,
  position: 'relative',
  zIndex: 1,
});

export const stepTitle: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: '0.8rem',
  lineHeight: 1.3,
};

export const stepDesc: SxProps<Theme> = {
  fontSize: '0.7rem',
  color: 'text.secondary',
  lineHeight: 1.4,
  mt: 0.25,
  wordBreak: 'break-word',
};

/* ── Projects list ── */

export const projectRow = (isDark: boolean): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.5,
  px: 1.5,
  py: 1.25,
  borderRadius: 2,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  '&:hover': {
    bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(13,148,136,0.04)',
  },
  '& + &': {
    borderTop: '1px solid',
    borderColor: 'divider',
  },
});

export const projectName: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: '0.82rem',
};

export const projectDesc: SxProps<Theme> = {
  fontSize: '0.68rem',
  color: 'text.secondary',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
};

export const projectMeta: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  flexShrink: 0,
};

export const chip: SxProps<Theme> = {
  height: 20,
  fontSize: '0.62rem',
  fontWeight: 600,
};

export const emptyState: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
  py: 4,
};

export const createBtn: SxProps<Theme> = {
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.75rem',
};

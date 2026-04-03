import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Snackbar,
  Typography,
  Tooltip,
  Popover,
  Stack,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import {
  HomeIcon,
  ProjectsIcon,
  ConnectionsIcon,
  DashboardIcon,
  PipelinesIcon,
  FlowsIcon,
  RunsIcon,
  ScheduleIcon,
  SchemaIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
  SunIcon,
  MoonIcon,
  PaletteIcon,
  VectisIcon,
  GearIcon,
  LogoutIcon,
  UsersIcon,
} from '@components/icons';
import { api } from '@services/api';
import { useAuthStore } from '@stores/useAuthStore';
import { useDemoStore } from '@stores/useDemoStore';
import { useThemeMode } from '@theme/useThemeMode';
import type { ThemeMode } from '@theme/useThemeMode';
import type { Project } from '@typedefs/index';

const RAIL_W = 56;
const SIDEBAR_W = 220;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const muiTheme = useTheme();
  const { mode, setMode } = useThemeMode();
  const { user, logout } = useAuthStore();
  const { demoMode, loaded: demoLoaded, fetchDemoMode, toastOpen, closeDemoToast } = useDemoStore();
  const [themeAnchor, setThemeAnchor] = useState<HTMLElement | null>(null);
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [collapsed, setCollapsed] = useState(isMobile);
  const [projectName, setProjectName] = useState('');

  const inProject = Boolean(projectId);
  const drawerWidth = collapsed ? RAIL_W : SIDEBAR_W;
  const primary = muiTheme.palette.primary.main;

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    if (!demoLoaded) fetchDemoMode();
  }, [demoLoaded, fetchDemoMode]);

  useEffect(() => {
    if (projectId) {
      api.get<Project>(`/projects/${projectId}`).then((p) => setProjectName(p.name)).catch(() => setProjectName(''));
    } else {
      setProjectName('');
    }
  }, [projectId]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/projects') return location.pathname === '/projects';
    if (path === '/plugins') return location.pathname === '/plugins';
    if (path.match(/^\/projects\/\d+$/)) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  // Top-level nav always visible
  const topNavItems: NavItem[] = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Projects', path: '/projects', icon: <ProjectsIcon /> },
    { label: 'Connections', path: '/connections', icon: <ConnectionsIcon /> },
    { label: 'Plugins', path: '/plugins', icon: <GearIcon sx={{ fontSize: 20 }} /> },
    { label: 'Team', path: '/team', icon: <UsersIcon /> },
  ];

  // Project sub-nav (shown below top nav when inside a project)
  const projectNavItems: NavItem[] = projectId
    ? [
        { label: 'Dashboard', path: `/projects/${projectId}`, icon: <DashboardIcon /> },
        { label: 'Pipelines', path: `/projects/${projectId}/pipelines`, icon: <PipelinesIcon /> },
        { label: 'Flows', path: `/projects/${projectId}/flows`, icon: <FlowsIcon /> },
        { label: 'Schema', path: `/projects/${projectId}/schema`, icon: <SchemaIcon /> },
        { label: 'Schedules', path: `/projects/${projectId}/schedules`, icon: <ScheduleIcon /> },
        { label: 'Runs', path: `/projects/${projectId}/runs`, icon: <RunsIcon /> },
      ]
    : [];

  const navItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right" arrow>
        <Box
          onClick={() => navigate(item.path)}
          aria-current={active ? 'page' : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: collapsed ? 0 : 1.25,
            py: 0.6,
            mx: collapsed ? 'auto' : 0,
            borderRadius: 2,
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: collapsed ? 38 : 'auto',
            height: 36,
            position: 'relative',
            color: active ? primary : 'text.secondary',
            bgcolor: active ? alpha(primary, 0.1) : 'transparent',
            '&:hover': {
              bgcolor: active ? alpha(primary, 0.14) : alpha(muiTheme.palette.text.primary, 0.04),
              color: active ? primary : 'text.primary',
            },
            transition: 'all 0.15s ease',
            ...(active && !collapsed ? {
              '&::before': {
                content: '""',
                position: 'absolute',
                left: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 18,
                borderRadius: 2,
                bgcolor: primary,
              },
            } : {}),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
            {item.icon}
          </Box>
          {!collapsed && (
            <Typography sx={{ fontSize: '0.78rem', fontWeight: active ? 600 : 450, whiteSpace: 'nowrap' }}>
              {item.label}
            </Typography>
          )}
        </Box>
      </Tooltip>
    );
  };

  const sectionLabel = (text: string) =>
    !collapsed ? (
      <Typography sx={{
        fontSize: '0.55rem', fontWeight: 700, color: 'text.disabled',
        textTransform: 'uppercase', letterSpacing: '0.1em', px: 1.25, mb: 0.25, mt: 0.5,
      }}>
        {text}
      </Typography>
    ) : (
      <Box sx={{ width: 20, height: 1, bgcolor: 'divider', mx: 'auto', my: 1 }} />
    );

  // Build breadcrumb segments
  const breadcrumbs: { label: string; path: string }[] = [];
  if (inProject) {
    breadcrumbs.push({ label: 'Projects', path: '/projects' });
    breadcrumbs.push({ label: projectName || '...', path: `/projects/${projectId}` });

    const sub = location.pathname.split('/').slice(4); // after /projects/:id/
    if (sub[0] === 'pipelines') {
      breadcrumbs.push({ label: 'Pipelines', path: `/projects/${projectId}/pipelines` });
      if (sub[1]) breadcrumbs.push({ label: `#${sub[1]}`, path: `/projects/${projectId}/pipelines/${sub[1]}` });
    } else if (sub[0] === 'flows') {
      breadcrumbs.push({ label: 'Flows', path: `/projects/${projectId}/flows` });
      if (sub[1]) breadcrumbs.push({ label: `#${sub[1]}`, path: `/projects/${projectId}/flows/${sub[1]}` });
    } else if (sub[0] === 'runs') {
      breadcrumbs.push({ label: 'Runs', path: `/projects/${projectId}/runs` });
      if (sub[1]) breadcrumbs.push({ label: `#${sub[1]}`, path: `/projects/${projectId}/runs/${sub[1]}` });
    } else if (sub[0] === 'schedules') {
      breadcrumbs.push({ label: 'Schedules', path: `/projects/${projectId}/schedules` });
    } else if (sub[0] === 'schema') {
      breadcrumbs.push({ label: 'Schema', path: `/projects/${projectId}/schema` });
    }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <Box
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* Logo + Theme */}
        <Box sx={{ px: collapsed ? 0.75 : 1.5, py: 1.5, minHeight: 48 }}>
          {collapsed ? (
            /* Collapsed: logo, theme stacked */
            <Stack spacing={0.5} alignItems="center">
              <Box
                sx={{ width: 30, height: 30, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${primary}, ${muiTheme.palette.primary.dark})`, cursor: 'pointer' }}
                onClick={() => navigate('/')}
                role="banner"
              >
                <VectisIcon sx={{ width: 16, height: 16, color: '#fff' }} />
              </Box>
              {demoMode && (
                <Chip label="D" size="small" sx={{ height: 16, width: 16, fontSize: '0.5rem', fontWeight: 700, bgcolor: 'warning.main', color: 'warning.contrastText', '& .MuiChip-label': { px: 0 } }} />
              )}
              <Tooltip title="Theme" placement="right" arrow>
                <IconButton
                  onClick={(e) => setThemeAnchor(e.currentTarget)}
                  size="small"
                  aria-label="Change theme"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' }, width: 30, height: 30 }}
                >
                  <PaletteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            /* Expanded: logo + name + demo + theme in a row */
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flex: 1 }}
                onClick={() => navigate('/')}
                role="banner"
              >
                <Box sx={{
                  width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${primary}, ${muiTheme.palette.primary.dark})`,
                }}>
                  <VectisIcon sx={{ width: 16, height: 16, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '-0.02em', color: 'text.primary' }}>
                  Vectis
                </Typography>
                {demoMode && (
                  <Chip label="Demo" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'warning.main', color: 'warning.contrastText', letterSpacing: '0.05em' }} />
                )}
              </Box>
              <Tooltip title="Theme" placement="right" arrow>
                <IconButton
                  onClick={(e) => setThemeAnchor(e.currentTarget)}
                  size="small"
                  aria-label="Change theme"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' }, width: 28, height: 28, flexShrink: 0 }}
                >
                  <PaletteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          <Popover
            open={Boolean(themeAnchor)}
            anchorEl={themeAnchor}
            onClose={() => setThemeAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { borderRadius: 2, p: 0.75, minWidth: 130 } } }}
          >
            {([
              { key: 'vectis' as ThemeMode, label: 'Vectis', icon: <VectisIcon sx={{ fontSize: 14 }} /> },
              { key: 'light' as ThemeMode, label: 'Light', icon: <SunIcon sx={{ fontSize: 14 }} /> },
              { key: 'dark' as ThemeMode, label: 'Dark', icon: <MoonIcon sx={{ fontSize: 14 }} /> },
            ] as const).map((opt) => (
              <Stack
                key={opt.key} direction="row" alignItems="center" spacing={1}
                onClick={() => { setMode(opt.key); setThemeAnchor(null); }}
                sx={{ px: 1, py: 0.6, borderRadius: 1.5, cursor: 'pointer', bgcolor: mode === opt.key ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}
              >
                {opt.icon}
                <Typography sx={{ fontSize: '0.72rem', fontWeight: mode === opt.key ? 700 : 400 }}>{opt.label}</Typography>
              </Stack>
            ))}
          </Popover>
        </Box>

        {/* Navigation */}
        <Box sx={{ px: collapsed ? 0.75 : 1, pt: 0.5, pb: 0.5 }}>
          {/* On mobile inside a project, hide top nav to save space */}
          {!(isMobile && inProject) && (
            <>
              {sectionLabel('Navigate')}
              <Stack spacing={0.25}>
                {topNavItems.map(navItem)}
              </Stack>
            </>
          )}

          {/* Project sub-nav */}
          {inProject && (
            <>
              {sectionLabel(collapsed ? '' : (projectName || '...'))}
              <Stack spacing={0.25}>
                {projectNavItems.map(navItem)}
              </Stack>
            </>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Footer */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: collapsed ? 0.75 : 1, py: 0.75 }}>
          {collapsed ? (
            /* Collapsed: vertical stack — avatar, logout, expand */
            <Stack spacing={0.5} alignItems="center">
              {user && (
                <Tooltip title={`${user.name} · ${user.role}`} placement="right" arrow>
                  <Box sx={{
                    width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(primary, 0.15), color: 'primary.main',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Box>
                </Tooltip>
              )}
              {user && (
                <Tooltip title="Sign out" placement="right" arrow>
                  <IconButton
                    onClick={() => { logout(); navigate('/login'); }}
                    size="small"
                    aria-label="Sign out"
                    sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, width: 30, height: 30 }}
                  >
                    <LogoutIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Expand" placement="right" arrow>
                <IconButton
                  onClick={() => setCollapsed(false)}
                  size="small"
                  aria-label="Expand sidebar"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' }, width: 30, height: 30 }}
                >
                  <MenuIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            /* Expanded: single row — avatar, name/role, logout, collapse */
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {user && (
                <Box sx={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(primary, 0.15), color: 'primary.main',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </Box>
              )}
              {user && (
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', textTransform: 'capitalize', lineHeight: 1.2 }}>
                    {user.role}
                  </Typography>
                </Box>
              )}
              <Tooltip title="Sign out" placement="top" arrow>
                <IconButton
                  onClick={() => { logout(); navigate('/login'); }}
                  size="small"
                  aria-label="Sign out"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, width: 28, height: 28, flexShrink: 0 }}
                >
                  <LogoutIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Collapse" placement="top" arrow>
                <IconButton
                  onClick={() => setCollapsed(true)}
                  size="small"
                  aria-label="Collapse sidebar"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' }, width: 28, height: 28, flexShrink: 0 }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Main Content ── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          bgcolor: 'background.default',
        }}
      >
        {/* Breadcrumb bar (only when inside a project) */}
        {breadcrumbs.length > 0 && (
          <Box sx={{
            px: { xs: 2, md: 3 },
            py: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
            bgcolor: 'background.paper',
          }}>
            {breadcrumbs.map((crumb, idx) => (
              <Box key={crumb.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {idx > 0 && <ChevronRightIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                <Typography
                  onClick={() => navigate(crumb.path)}
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                    color: idx === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': { color: primary },
                    transition: 'color 0.15s',
                  }}
                >
                  {crumb.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={closeDemoToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeDemoToast} severity="warning" variant="filled" sx={{ width: '100%' }}>
          Demo mode is active. Actions are not allowed.
        </Alert>
      </Snackbar>
    </Box>
  );
}

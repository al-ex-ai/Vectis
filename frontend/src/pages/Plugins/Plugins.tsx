import { useEffect, useState } from 'react';
import {
  Typography, Box, Card, CardContent, Grid, Chip, CircularProgress,
  Stack, Tabs, Tab, Switch, Drawer, useTheme, alpha,
} from '@mui/material';
import { ConnectionsIcon, DatabaseIcon, GearIcon } from '@components/icons';
import { api } from '@services/api';
import type { Connection } from '@typedefs/index';
import PluginDetail from './PluginDetail';
import type { PluginInfo } from './PluginDetail';

export default function Plugins() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<PluginInfo | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    Promise.all([
      api.get<PluginInfo[]>('/plugins/'),
      api.get<Connection[]>('/connections').catch(() => []),
    ])
      .then(([p, c]) => { setPlugins(p); setConnections(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const connectors = plugins.filter((p) => p.type === 'connector');
  const providers = plugins.filter((p) => p.type === 'provider');
  const filtered = tab === 0 ? plugins : tab === 1 ? connectors : providers;

  const getConnectionCount = (plugin: PluginInfo) =>
    connections.filter((c) => plugin.connection_types.includes(c.type)).length;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Plugins</Typography>
          <Typography variant="body2" color="text.secondary">Manage source connectors and database providers</Typography>
        </Box>
        <Box sx={{ px: 2, py: 0.75, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.06), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2) }}>
          <Typography sx={{ fontSize: 12, color: 'primary.main', fontWeight: 600 }}>{plugins.length} installed</Typography>
        </Box>
      </Stack>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 3 }}>
        {[
          { label: 'Connectors', value: connectors.length, color: theme.palette.primary.main },
          { label: 'Providers', value: providers.length, color: theme.palette.success.main },
          { label: 'Connections', value: connections.length, color: theme.palette.info.main },
        ].map((stat) => (
          <Box key={stat.label} sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 18, sm: 24 }, fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
            <Typography noWrap sx={{ fontSize: { xs: 9, sm: 11 }, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto"
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40, fontSize: { xs: '0.72rem', sm: '0.82rem' } } }}>
        <Tab label={`All (${plugins.length})`} />
        <Tab label={`Connectors (${connectors.length})`} />
        <Tab label={`Providers (${providers.length})`} />
      </Tabs>

      {/* Plugin grid */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
          <GearIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No plugins installed</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, fontFamily: 'monospace' }}>pip install vectis-connector-hubspot</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((plugin) => {
            const connCount = getConnectionCount(plugin);
            const isConnector = plugin.type === 'connector';
            const accentColor = isConnector ? theme.palette.primary.main : theme.palette.success.main;
            return (
              <Grid key={plugin.name} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer',
                    border: '1px solid', borderColor: 'divider', transition: 'all 0.2s ease',
                    '&:hover': { borderColor: accentColor, transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(accentColor, isDark ? 0.15 : 0.08)}` },
                  }}
                  onClick={() => setSelected(plugin)}
                >
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Box sx={{ height: 3, bgcolor: accentColor, opacity: 0.6 }} />
                    <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(accentColor, isDark ? 0.15 : 0.08), flexShrink: 0 }}>
                          {isConnector ? <ConnectionsIcon sx={{ fontSize: 24, color: accentColor }} /> : <DatabaseIcon sx={{ fontSize: 24, color: accentColor }} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{plugin.name}</Typography>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} title="Active" />
                          </Stack>
                          <Typography variant="caption" color="text.disabled">v{plugin.version}</Typography>
                        </Box>
                        <Switch size="small" checked disabled sx={{ mt: -0.5 }} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary"
                        sx={{ mt: 1.5, lineHeight: 1.5, fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {plugin.description}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={0.5}>
                          <Chip label={isConnector ? 'source' : 'destination'} size="small"
                            sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha(accentColor, isDark ? 0.12 : 0.06), color: accentColor, textTransform: 'uppercase', letterSpacing: 0.3 }} />
                          {plugin.builtin && <Chip label="built-in" size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />}
                        </Stack>
                        {connCount > 0 && (
                          <Chip label={`${connCount} connection${connCount > 1 ? 's' : ''}`} size="small"
                            sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }} />
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Detail Drawer */}
      <Drawer anchor="right" open={selected !== null} onClose={() => setSelected(null)} PaperProps={{ sx: { width: { xs: '100%', md: 480 } } }}>
        {selected && <PluginDetail plugin={selected} connectionCount={getConnectionCount(selected)} isDark={isDark} onClose={() => setSelected(null)} />}
      </Drawer>
    </Box>
  );
}

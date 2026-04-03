import {
  Typography, Box, Stack, Chip, IconButton, Divider,
} from '@mui/material';
import { ConnectionsIcon, DatabaseIcon, CloseIcon } from '@components/icons';

interface ConfigField {
  type?: string;
  required?: boolean;
  secret?: boolean;
  default?: string | number;
  placeholder?: string;
}

export interface PluginInfo {
  name: string;
  type: string;
  description: string;
  version: string;
  author: string;
  connection_types: string[];
  config_schema: Record<string, ConfigField>;
  builtin: boolean;
}

export default function PluginDetail({
  plugin, connectionCount, isDark, onClose,
}: {
  plugin: PluginInfo;
  connectionCount: number;
  isDark: boolean;
  onClose: () => void;
}) {
  const isConnector = plugin.type === 'connector';
  const accentColor = isConnector ? '#14b8a6' : '#22c55e';
  const configEntries = Object.entries(plugin.config_schema);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${accentColor}${isDark ? '18' : '0c'}, transparent)`,
          borderBottom: '1px solid', borderColor: 'divider',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 52, height: 52, borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: accentColor, color: '#fff',
              }}
            >
              {isConnector ? <ConnectionsIcon sx={{ fontSize: 28 }} /> : <DatabaseIcon sx={{ fontSize: 28 }} />}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>{plugin.name}</Typography>
              <Typography variant="caption" color="text.secondary">v{plugin.version} by {plugin.author}</Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {/* Status row */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>Status</Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Active</Typography>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>Connections</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 700, mt: 0.25 }}>{connectionCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>Type</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.5, textTransform: 'capitalize' }}>{plugin.type}</Typography>
          </Box>
        </Stack>

        {/* About */}
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>About</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>{plugin.description}</Typography>

        {/* Connection types */}
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Supported Connection Types</Typography>
        <Stack direction="row" spacing={0.75} sx={{ mb: 3, flexWrap: 'wrap', gap: 0.5 }}>
          {plugin.connection_types.map((ct) => (
            <Chip key={ct} label={ct}
              sx={{ fontWeight: 600, bgcolor: `${accentColor}${isDark ? '20' : '12'}`, color: accentColor, fontFamily: 'monospace', fontSize: '0.75rem' }} />
          ))}
        </Stack>

        {/* Config schema */}
        {configEntries.length > 0 && (
          <>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>Configuration Schema</Typography>
            <Stack spacing={1}>
              {configEntries.map(([key, field]) => (
                <Box key={key} sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{key}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {field.required && <Chip label="required" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                      {field.secret && <Chip label="secret" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                      <Chip label={field.type ?? 'string'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                    </Stack>
                  </Stack>
                  {(field.default !== undefined || field.placeholder) && (
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5, fontFamily: 'monospace' }}>
                      {field.default !== undefined ? `default: ${field.default}` : `e.g. ${field.placeholder}`}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 3 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Installation</Typography>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', fontFamily: 'monospace', fontSize: 13 }}>
              {plugin.builtin ? (
                <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary' }}>Built-in plugin — included with Vectis installation</Typography>
              ) : (
                <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.primary' }}>
                  pip install vectis-{plugin.type}-{plugin.name.toLowerCase().replace(/\s+/g, '-')}
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

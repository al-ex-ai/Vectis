import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CloseIcon } from '@components/icons';

export interface PipelineSettings {
  batch_size: number;
  retry_count: number;
  timeout_seconds: number;
  track_fks: boolean;
  enforce_fks: boolean;
  fk_mode: 'within_schema' | 'cross_schema' | 'all';
  notifications_on_failure: string;
  notifications_on_completion: string;
}

interface PipelineSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: PipelineSettings;
  onSettingsChange: (settings: PipelineSettings) => void;
  onSave: () => void;
}

export default function PipelineSettingsDrawer({
  open,
  onClose,
  settings,
  onSettingsChange,
  onSave,
}: PipelineSettingsDrawerProps) {
  const update = (patch: Partial<PipelineSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 400, bgcolor: 'background.default' } }}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>Pipeline Settings</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Stack>

        {/* Data Transfer */}
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
          Data Transfer
        </Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField label="Batch Size" type="number" size="small" fullWidth
            value={settings.batch_size}
            onChange={e => update({ batch_size: Number(e.target.value) || 1000 })}
            helperText="Records per batch (default: 1000)"
          />
          <TextField label="Retry Count" type="number" size="small" fullWidth
            value={settings.retry_count}
            onChange={e => update({ retry_count: Math.min(3, Math.max(0, Number(e.target.value))) })}
            helperText="Retries per failed batch (0-3)"
            inputProps={{ min: 0, max: 3 }}
          />
          <TextField label="Timeout (seconds)" type="number" size="small" fullWidth
            value={settings.timeout_seconds}
            onChange={e => update({ timeout_seconds: Number(e.target.value) || 300 })}
            helperText="Max time per entity before timeout"
          />
        </Stack>

        {/* FK Management */}
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
          Foreign Key Management
        </Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Track FKs</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Discover FK relationships</Typography>
            </Box>
            <Checkbox checked={settings.track_fks}
              onChange={e => update({ track_fks: e.target.checked })} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Enforce FKs</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Create FK constraints in dest DB</Typography>
            </Box>
            <Checkbox checked={settings.enforce_fks} disabled={!settings.track_fks}
              onChange={e => update({ enforce_fks: e.target.checked })} />
          </Stack>
          <FormControl size="small" fullWidth disabled={!settings.track_fks || !settings.enforce_fks}>
            <Select value={settings.fk_mode}
              onChange={e => update({ fk_mode: e.target.value as PipelineSettings['fk_mode'] })}>
              <MenuItem value="within_schema">Within Schema Only</MenuItem>
              <MenuItem value="cross_schema">Cross Schema</MenuItem>
              <MenuItem value="all">All (Including Lookups)</MenuItem>
            </Select>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, ml: 0.5 }}>
              FK scope — which relationships to enforce
            </Typography>
          </FormControl>
        </Stack>

        {/* Notifications */}
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
          Notifications
        </Typography>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField label="On Failure (webhook URL)" size="small" fullWidth
            value={settings.notifications_on_failure}
            onChange={e => update({ notifications_on_failure: e.target.value })}
            placeholder="https://hooks.slack.com/..."
          />
          <TextField label="On Completion (webhook URL)" size="small" fullWidth
            value={settings.notifications_on_completion}
            onChange={e => update({ notifications_on_completion: e.target.value })}
            placeholder="https://hooks.slack.com/..."
          />
        </Stack>

        <Button variant="contained" fullWidth onClick={onSave}
          sx={{ textTransform: 'none' }}>
          Save Settings
        </Button>
      </Box>
    </Drawer>
  );
}

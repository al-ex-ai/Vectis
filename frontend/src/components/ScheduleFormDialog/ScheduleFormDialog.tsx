import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import type { Pipeline, Flow } from '@typedefs/index';

export interface ScheduleFormData {
  name: string;
  description: string;
  target_type: 'pipeline' | 'flow';
  pipeline_id: string;
  flow_id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  overlap_policy: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  form: ScheduleFormData;
  pipelines: Pipeline[];
  flows: Flow[];
  onChange: (form: ScheduleFormData) => void;
  onSave: () => void;
  editing: boolean;
}

const CRON_PRESETS = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 6 * * *', label: 'Daily at 6 AM' },
  { value: '0 0 * * 1', label: 'Weekly (Monday midnight)' },
  { value: '0 0 1 * *', label: 'Monthly (1st midnight)' },
];

const TIMEZONES = [
  'UTC',
  'US/Eastern',
  'US/Central',
  'US/Pacific',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function ScheduleFormDialog({ open, onClose, form, pipelines, flows, onChange, onSave, editing }: Props) {
  const setField = <K extends keyof ScheduleFormData>(key: K, value: ScheduleFormData[K]) =>
    onChange({ ...form, [key]: value });

  const isPreset = CRON_PRESETS.some((p) => p.value === form.cron_expression);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          {!editing && (
            <>
              <TextField
                label="Target Type"
                select
                value={form.target_type}
                onChange={(e) => {
                  const val = e.target.value as 'pipeline' | 'flow';
                  onChange({ ...form, target_type: val, pipeline_id: '', flow_id: '' });
                }}
                required
                fullWidth
              >
                <MenuItem value="pipeline">Pipeline</MenuItem>
                <MenuItem value="flow">Flow</MenuItem>
              </TextField>

              {form.target_type === 'pipeline' && (
                <TextField
                  label="Pipeline"
                  select
                  value={form.pipeline_id}
                  onChange={(e) => setField('pipeline_id', e.target.value)}
                  required
                  fullWidth
                >
                  {pipelines.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {form.target_type === 'flow' && (
                <TextField
                  label="Flow"
                  select
                  value={form.flow_id}
                  onChange={(e) => setField('flow_id', e.target.value)}
                  required
                  fullWidth
                >
                  {flows.map((f) => (
                    <MenuItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </>
          )}

          <TextField
            label="Schedule"
            select
            value={isPreset ? form.cron_expression : '__custom'}
            onChange={(e) => {
              if (e.target.value !== '__custom') {
                setField('cron_expression', e.target.value);
              }
            }}
            fullWidth
          >
            {CRON_PRESETS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
            <MenuItem value="__custom">Custom cron expression</MenuItem>
          </TextField>

          {!isPreset && (
            <TextField
              label="Cron Expression"
              value={form.cron_expression}
              onChange={(e) => setField('cron_expression', e.target.value)}
              required
              fullWidth
              placeholder="* * * * *"
              helperText="minute hour day month weekday"
            />
          )}

          <TextField
            label="Timezone"
            select
            value={form.timezone}
            onChange={(e) => setField('timezone', e.target.value)}
            fullWidth
          >
            {TIMEZONES.map((tz) => (
              <MenuItem key={tz} value={tz}>
                {tz}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Overlap Policy"
            select
            value={form.overlap_policy}
            onChange={(e) => setField('overlap_policy', e.target.value)}
            fullWidth
            helperText="What happens if a scheduled run triggers while the previous is still running"
          >
            <MenuItem value="skip">Skip (wait for next trigger)</MenuItem>
            <MenuItem value="allow">Allow parallel runs</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={form.enabled}
                onChange={(e) => setField('enabled', e.target.checked)}
                color="primary"
              />
            }
            label="Enabled"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave}>
          {editing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ScheduleFormDialog;

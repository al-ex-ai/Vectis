import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Tooltip,
  Switch,
} from '@mui/material';
import { PlusIcon, TrashIcon, EditPenIcon, ScheduleIcon } from '@components/icons';
import Toast from '@components/Toast';
import ScheduleFormDialog, { type ScheduleFormData } from '@components/ScheduleFormDialog';
import { api } from '@services/api';
import { MESSAGES } from '@utils/constants';
import { formatRelativeTime } from '@utils/formatters';
import type { Schedule, Pipeline, Flow } from '@typedefs/index';

const CRON_PRESETS: Record<string, string> = {
  '0 * * * *': 'Every hour',
  '0 */6 * * *': 'Every 6 hours',
  '0 0 * * *': 'Daily at midnight',
  '0 6 * * *': 'Daily at 6 AM',
  '0 0 * * 1': 'Weekly (Monday)',
  '0 0 1 * *': 'Monthly (1st)',
};

function cronLabel(expr: string): string {
  return CRON_PRESETS[expr] ?? expr;
}

function statusChipColor(status?: string): 'success' | 'error' | 'info' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'info';
  return 'default';
}

const emptyForm = (): ScheduleFormData => ({
  name: '',
  description: '',
  target_type: 'pipeline',
  pipeline_id: '',
  flow_id: '',
  cron_expression: '0 0 * * *',
  timezone: 'UTC',
  enabled: true,
  overlap_policy: 'skip',
});

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ScheduleFormData>(emptyForm());
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info',
  });
  const { projectId } = useParams<{ projectId: string }>();

  const load = useCallback(() => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    Promise.all([
      api.get<Schedule[]>(`/schedules${qs}`).then(setSchedules),
      api.get<Pipeline[]>(`/pipelines${qs}`).then(setPipelines),
      api.get<Flow[]>(`/flows${qs}`).then(setFlows),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description,
      target_type: s.target_type,
      pipeline_id: s.pipeline_id ? String(s.pipeline_id) : '',
      flow_id: s.flow_id ? String(s.flow_id) : '',
      cron_expression: s.cron_expression,
      timezone: s.timezone,
      enabled: s.enabled,
      overlap_policy: s.overlap_policy,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      pipeline_id: form.pipeline_id ? Number(form.pipeline_id) : null,
      flow_id: form.flow_id ? Number(form.flow_id) : null,
      project_id: projectId ? Number(projectId) : null,
    };
    try {
      if (editingId) {
        await api.put(`/schedules/${editingId}`, {
          name: payload.name,
          description: payload.description,
          cron_expression: payload.cron_expression,
          timezone: payload.timezone,
          enabled: payload.enabled,
          overlap_policy: payload.overlap_policy,
        });
      } else {
        await api.post('/schedules', payload);
      }
      setDialogOpen(false);
      setToast({ open: true, message: editingId ? 'Schedule updated' : 'Schedule created', severity: 'success' });
      load();
    } catch (err) {
      setToast({
        open: true,
        message: `Error: ${err instanceof Error ? err.message : err}`,
        severity: 'error',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    try {
      await api.del(`/schedules/${id}`);
      setToast({ open: true, message: 'Schedule deleted', severity: 'success' });
      load();
    } catch (err) {
      setToast({
        open: true,
        message: `Error: ${err instanceof Error ? err.message : err}`,
        severity: 'error',
      });
    }
  };

  const handleToggle = async (s: Schedule) => {
    try {
      await api.post(`/schedules/${s.id}/${s.enabled ? 'pause' : 'resume'}`);
      load();
    } catch (err) {
      setToast({
        open: true,
        message: `Error: ${err instanceof Error ? err.message : err}`,
        severity: 'error',
      });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Automated pipeline and flow execution
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlusIcon />}
          onClick={openCreate}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Create Schedule
        </Button>
        <IconButton
          color="primary"
          onClick={openCreate}
          sx={{
            display: { xs: 'inline-flex', sm: 'none' },
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            width: 34,
            height: 34,
          }}
        >
          <PlusIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : schedules.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <ScheduleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" gutterBottom>
            No schedules configured yet
          </Typography>
          <Typography variant="body2">
            Automate pipeline and flow runs on a cron schedule
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {schedules.map((s) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: s.enabled ? 'divider' : 'action.disabledBackground',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: s.enabled ? 1 : 0.65,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: 2.5,
                    '&:last-child': { pb: 2.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {s.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                      <Chip
                        label={s.target_type}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          bgcolor: s.target_type === 'pipeline' ? 'info.main' : 'secondary.main',
                          color: s.target_type === 'pipeline' ? 'info.contrastText' : 'secondary.contrastText',
                        }}
                      />
                    </Stack>
                  </Stack>

                  <Box sx={{ minHeight: 36, mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {s.pipeline_name || s.flow_name || 'Not configured'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      label={cronLabel(s.cron_expression)}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    />
                    <Chip
                      label={s.overlap_policy}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    />
                    {s.last_status && (
                      <Chip
                        label={s.last_status}
                        size="small"
                        color={statusChipColor(s.last_status)}
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                      />
                    )}
                  </Stack>

                  {s.run_count > 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
                      {s.run_count} run{s.run_count !== 1 ? 's' : ''}
                      {s.last_run_at ? ` · last ${formatRelativeTime(s.last_run_at)}` : ''}
                    </Typography>
                  )}

                  <Box sx={{ flex: 1 }} />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                  >
                    <Tooltip title={s.enabled ? 'Pause schedule' : 'Resume schedule'} arrow>
                      <Switch
                        checked={s.enabled}
                        onChange={() => handleToggle(s)}
                        size="small"
                        color="primary"
                      />
                    </Tooltip>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title="Edit" arrow>
                        <IconButton size="small" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                          <EditPenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(s.id)}
                          sx={{ color: 'error.main' }}
                          aria-label={`Delete ${s.name}`}
                        >
                          <TrashIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <ScheduleFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        form={form}
        pipelines={pipelines}
        flows={flows}
        onChange={setForm}
        onSave={handleSave}
        editing={!!editingId}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </Box>
  );
}

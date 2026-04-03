import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Stack,

  Button,
  Avatar,
  useTheme,
} from '@mui/material';
import { ConnectionsIcon, PipelinesIcon, RunsIcon, FlowsIcon } from '@components/icons';
import { api } from '@services/api';
import { fmtTs } from '@utils/formatters';
import { runStatusColor } from '@utils/constants';
import type { PipelineRun } from '@typedefs/index';
import * as sx from './Dashboard.styles';

interface FlowRunSummary {
  id: number;
  flow_id: number;
  flow_name: string;
  status: string;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  started_at: string;
  completed_at: string | null;
}

interface Stats {
  connections: number;
  pipelines: number;
  flows: number;
  active_runs: number;
  recent_runs: PipelineRun[];
  recent_flow_runs: FlowRunSummary[];
}

const statCards = [
  {
    key: 'connections' as const,
    label: 'Connections',
    icon: ConnectionsIcon,
    palette: 'info' as const,
    pathFn: () => '/connections',
  },
  {
    key: 'pipelines' as const,
    label: 'Pipelines',
    icon: PipelinesIcon,
    palette: 'success' as const,
    pathFn: (pid?: string) => (pid ? `/projects/${pid}/pipelines` : '/pipelines'),
  },
  {
    key: 'flows' as const,
    label: 'Flows',
    icon: FlowsIcon,
    palette: 'secondary' as const,
    pathFn: (pid?: string) => (pid ? `/projects/${pid}/flows` : '/flows'),
  },
  {
    key: 'active_runs' as const,
    label: 'Active Runs',
    icon: RunsIcon,
    palette: 'warning' as const,
    pathFn: (pid?: string) => (pid ? `/projects/${pid}/runs` : '/runs'),
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const theme = useTheme();

  useEffect(() => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    api
      .get<Stats>(`/dashboard${qs}`)
      .then(setStats)
      .catch(console.error);
  }, [projectId]);

  if (!stats) {
    return (
      <Box sx={sx.loadingContainer}>
        <CircularProgress />
      </Box>
    );
  }

  const runsPath = projectId ? `/projects/${projectId}/runs` : '/runs';

  return (
    <Box sx={sx.pageWrapper}>
      <Box>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          ETL Pipeline Overview
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          const paletteColor = theme.palette[s.palette].main;
          const paletteBg = `${paletteColor}14`;
          return (
            <Grid key={s.key} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                role="button"
                tabIndex={0}
                aria-label={`View ${s.label}`}
                sx={sx.statCard}
                onClick={() => navigate(s.pathFn(projectId))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(s.pathFn(projectId)); }}
              >
                <CardContent sx={{ py: 2.5, px: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={sx.statAvatar(paletteBg, s.palette)}
                    >
                      <Icon sx={{ fontSize: 22 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
                        {stats[s.key]}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={sx.statLabel}
                      >
                        {s.label}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Recent Runs */}
      <Box sx={{ mt: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>Recent Runs</Typography>
          <Button size="small" onClick={() => navigate(runsPath)}>View All</Button>
        </Stack>

        {stats.recent_runs.length === 0 ? (
          <Card variant="outlined" sx={sx.emptyState}>
            <RunsIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography color="text.secondary">No pipeline runs yet.</Typography>
          </Card>
        ) : (
          <Box sx={sx.runListWrapper}>
            {stats.recent_runs.map((r) => (
              <Box
                key={r.id}
                sx={sx.runRow}
                onClick={() => navigate(projectId ? `/projects/${projectId}/runs/${r.id}` : `/runs/${r.id}`)}
              >
                <Typography sx={sx.runName}>{r.pipeline_name}</Typography>
                <Chip label={r.status} size="small" color={runStatusColor(r.status)} sx={sx.statusChip} />
                <Typography sx={sx.recordsText}>
                  {(r.processed_records ?? 0).toLocaleString()} / {(r.total_records ?? 0).toLocaleString()}
                </Typography>
                <Typography sx={sx.timestampText}>{fmtTs(r.started_at)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Recent Flow Runs */}
      <Box sx={{ mt: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>Recent Flow Runs</Typography>
          <Button size="small" onClick={() => navigate(projectId ? `/projects/${projectId}/flows` : '/flows')}>View All</Button>
        </Stack>

        {!stats.recent_flow_runs || stats.recent_flow_runs.length === 0 ? (
          <Card variant="outlined" sx={sx.emptyState}>
            <FlowsIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography color="text.secondary">No flow runs yet.</Typography>
          </Card>
        ) : (
          <Box sx={sx.runListWrapper}>
            {stats.recent_flow_runs.map((fr) => (
              <Box
                key={fr.id}
                sx={sx.runRow}
                onClick={() => navigate(
                  projectId
                    ? `/projects/${projectId}/flows/${fr.flow_id}/runs/${fr.id}`
                    : `/flows/${fr.flow_id}/runs/${fr.id}`,
                )}
              >
                <Typography sx={sx.runName}>{fr.flow_name}</Typography>
                <Chip label={fr.status.replace(/_/g, ' ')} size="small" color={runStatusColor(fr.status)} sx={sx.statusChip} />
                <Typography sx={sx.recordsText}>
                  {fr.completed_steps}/{fr.total_steps} steps
                  {fr.failed_steps > 0 ? ` (${fr.failed_steps} failed)` : ''}
                </Typography>
                <Typography sx={sx.timestampText}>{fmtTs(fr.started_at)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  Grid,
} from '@mui/material';
import { BackIcon, RefreshIcon, EyeIcon as VisibilityIcon } from '@components/icons';
import { themedScrollbar } from '@utils/styles';
import { api } from '@services/api';
import DataPreviewDialog from '@components/DataPreviewDialog';
import { fmtTs, fmtDuration } from '@utils/formatters';
import { runStatusColor } from '@utils/constants';
import type { PipelineRun } from '@typedefs/index';
import * as sx from './RunDetail.styles';

const progressColor = (s: string): 'success' | 'error' | 'info' => {
  if (s === 'completed') return 'success';
  if (s === 'failed') return 'error';
  return 'info';
};

interface TransferLogEntry {
  id: number;
  entity_mapping_id: number;
  source_entity?: string;
  dest_table?: string;
  source_id: string;
  status: string;
  batch_number: number;
  transferred_at: string;
  error_detail?: string;
}

interface RunWithDest extends PipelineRun {
  dest_connection_id?: number;
}

export default function RunDetail() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '';
  const navigate = useNavigate();
  const [run, setRun] = useState<RunWithDest | null>(null);
  const [logs, setLogs] = useState<TransferLogEntry[]>([]);
  const [previewTable, setPreviewTable] = useState('');

  const loadFull = useCallback(() => {
    api
      .get<{ run: RunWithDest; logs: TransferLogEntry[] }>(`/runs/${id}`)
      .then((d) => {
        setRun(d.run);
        setLogs(d.logs ?? []);
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    loadFull();
  }, [loadFull]);

  useEffect(() => {
    const active = run?.status?.startsWith('running') || run?.status?.startsWith('cdc');
    if (!active) return;
    const interval = setInterval(loadFull, 8000);
    return () => clearInterval(interval);
  }, [run?.status, loadFull]);

  if (!run)
    return (
      <Box sx={sx.loadingContainer}>
        <CircularProgress />
      </Box>
    );

  const isRunning = run.status?.startsWith('running') || run.status?.startsWith('cdc');
  const isCdc = run.status?.startsWith('cdc');
  const canResume = run.status === 'failed' || run.status === 'cancelled';

  const currentStep =
    isRunning && run.status.includes(':') ? run.status.split(':')[1].trim() : null;

  const handleCancel = () => {
    api
      .post(`/runs/${id}/cancel`)
      .then(() => loadFull())
      .catch(console.error);
  };

  const handleResume = () => {
    api
      .post<{ run_id: number }>(`/runs/${id}/resume`)
      .then((r) => navigate(`${basePath}/runs/${r.run_id}`))
      .catch(console.error);
  };

  const stats = [
    { label: 'Records', value: run.processed_records.toLocaleString() },
    {
      label: 'Failed',
      value: run.failed_records,
      color: run.failed_records > 0 ? 'error.main' : undefined,
    },
    { label: 'Batches', value: logs.length || '-' },
    { label: 'Batch Size', value: run.batch_size.toLocaleString() },
    { label: 'Duration', value: fmtDuration(run.started_at, run.completed_at ?? undefined) },
  ];

  return (
    <Box sx={sx.pageWrapper}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <Tooltip title="Back to runs">
          <IconButton size="small" onClick={() => navigate(`${basePath}/runs`)}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" fontWeight={700}>
          Run #{run.id}
        </Typography>
        <Chip
          label={isCdc ? 'CDC sync' : isRunning ? 'running' : run.status}
          color={(isCdc ? 'warning' : runStatusColor(run.status))}
        />
        {currentStep && <Chip label={currentStep} size="small" variant="outlined" color="info" />}
        <Box sx={{ flex: 1 }} />
        {isRunning && (
          <Button size="small" color="error" variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
        )}
        {canResume && (
          <Button
            size="small"
            color="primary"
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleResume}
          >
            Resume
          </Button>
        )}
      </Stack>

      {/* Pipeline info bar */}
      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
        <Chip label={run.pipeline_name} variant="outlined" size="small" />
        <Typography variant="caption" color="text.secondary">
          Started: {fmtTs(run.started_at)}
        </Typography>
        {run.completed_at && (
          <Typography variant="caption" color="text.secondary">
            Completed: {fmtTs(run.completed_at)}
          </Typography>
        )}
        <Chip
          label={fmtDuration(run.started_at, run.completed_at ?? undefined)}
          size="small"
          sx={sx.durationChip}
        />
      </Stack>

      {/* Progress bar */}
      {(run.processed_records > 0 || isRunning) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant={isRunning && !run.completed_at ? 'indeterminate' : 'determinate'}
            value={run.completed_at ? 100 : 0}
            color={progressColor(run.status)}
            sx={sx.progressBar}
          />
          <Stack direction="row" justifyContent="space-between" mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              {run.processed_records.toLocaleString()} records processed
              {run.total_records > run.processed_records &&
                ` / ${run.total_records.toLocaleString()} fetched`}
            </Typography>
            {isRunning && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                in progress...
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {/* Stats cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <Card
              variant="outlined"
              sx={sx.statCard}
            >
              <Typography variant="overline" sx={sx.statOverline}>
                {s.label}
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ color: s.color ?? 'text.primary' }}
              >
                {s.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Error section */}
      {run.error_message && (
        <Card variant="outlined" sx={sx.errorCard}>
          <Typography variant="subtitle2" color="error.main" gutterBottom>
            Error
          </Typography>
          <Typography
            variant="body2"
            sx={sx.errorMessage}
          >
            {run.error_message}
          </Typography>
        </Card>
      )}

      {/* Transfer Log */}
      {logs.length > 0 && (
        <Card
          variant="outlined"
          sx={sx.logCard}
        >
          <Box sx={{ p: 2, flexShrink: 0 }}>
            <Typography
              variant="subtitle2"
              sx={sx.logHeader}
            >
              Transfer Log ({logs.length} batches)
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', ...themedScrollbar }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Table', 'Batch', 'Records', 'Status', 'Time', 'Preview'].map((h) => (
                    <TableCell
                      key={h}
                      align={
                        h === 'Batch' || h === 'Status' || h === 'Preview'
                          ? 'center'
                          : h === 'Records'
                            ? 'right'
                            : 'left'
                      }
                      sx={sx.tableHeaderCell}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l, idx) => {
                  const countMatch =
                    l.source_id?.match(/_(\d+)_records/) ??
                    l.source_id?.match(/total_(\d+)_records/);
                  const recordCount = countMatch
                    ? parseInt(countMatch[1]).toLocaleString()
                    : '-';
                  const destTableDisplay = l.dest_table?.includes('.')
                    ? l.dest_table.split('.').pop()
                    : l.dest_table;
                  const destTableFull = l.dest_table;
                  return (
                    <TableRow
                      key={l.id}
                      sx={{
                        bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover',
                        '& td': { py: 1.2 },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        {destTableDisplay ?? l.source_entity ?? '-'}
                      </TableCell>
                      <TableCell align="center">{l.batch_number}</TableCell>
                      <TableCell align="right">{recordCount}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={l.status}
                          size="small"
                          color={l.status === 'transferred' ? 'success' : 'error'}
                          variant={l.status === 'transferred' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>{fmtTs(l.transferred_at)}</TableCell>
                      <TableCell align="center">
                        {destTableFull && run?.dest_connection_id && (
                          <Tooltip title={`Preview ${destTableDisplay}`}>
                            <IconButton size="small" onClick={() => setPreviewTable(destTableFull)} aria-label={`Preview ${destTableDisplay}`}>
                              <VisibilityIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {run?.dest_connection_id && (
        <DataPreviewDialog
          open={previewTable !== ''}
          onClose={() => setPreviewTable('')}
          connectionId={run.dest_connection_id}
          tableName={previewTable}
        />
      )}
    </Box>
  );
}

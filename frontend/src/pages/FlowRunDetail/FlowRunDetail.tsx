import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Box, Stack, Chip, CircularProgress, IconButton, Tooltip,
  Collapse, LinearProgress,
} from '@mui/material';
import { api } from '@services/api';
import { BackIcon, TrashIcon, ChevronDownIcon } from '@components/icons';
import DataPreviewDialog from '@components/DataPreviewDialog';
import { statusHex } from '@theme/constants';
import * as sx from './FlowRunDetail.styles';

interface StepResult { status: string; run_id: number | null; error: string | null; started_at: string | null; completed_at: string | null }
interface FlowRun { id: number; flow_id: number; status: string; total_steps: number; completed_steps: number; failed_steps: number; started_at: string; completed_at: string | null; step_results: Record<string, StepResult> }
interface Pipeline { id: number; name: string; tags: string }
interface PipelineRun { id: number; pipeline_id: number; status: string; total_records: number; processed_records: number; failed_records: number; dest_connection_id?: number }
interface TransferLogEntry { dest_table: string; source_entity: string; batch_number: number; records_transferred: number; status: string; transferred_at: string; source_id: string }

function parseTags(tags: string | string[]): string[] {
  if (Array.isArray(tags)) return tags;
  try { return JSON.parse(tags || '[]'); } catch { return []; }
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function statusIcon(status: string) {
  const color = statusHex(status);
  if (status === 'running') return <CircularProgress size={16} sx={{ color }} />;
  return <Box sx={sx.statusDot(color)} />;
}

export default function FlowRunDetail() {
  const { flowId, flowRunId, projectId } = useParams<{ flowId: string; flowRunId: string; projectId: string }>();
  const navigate = useNavigate();
  const basePath = projectId ? `/projects/${projectId}` : '';
  const [flowRun, setFlowRun] = useState<FlowRun | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<Record<number, PipelineRun>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [flowName, setFlowName] = useState('');
  const [transferLogs, setTransferLogs] = useState<Record<number, TransferLogEntry[]>>({});
  const [previewTable, setPreviewTable] = useState('');
  const [previewConnId, setPreviewConnId] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<FlowRun>(`/flows/runs/${flowRunId}`),
      api.get<Pipeline[]>(`/pipelines?project_id=${projectId ?? 1}`),
      api.get<{ name: string }>(`/flows/${flowId}`),
    ]).then(([run, pipes, flow]) => {
      const parsed = { ...run, step_results: typeof run.step_results === 'string' ? JSON.parse(run.step_results as unknown as string || '{}') : (run.step_results ?? {}) };
      setFlowRun(parsed);
      setPipelines(pipes);
      setFlowName(flow.name);
      const stepValues = Object.values(parsed.step_results) as StepResult[];
      const runIds = stepValues.filter(s => s.run_id).map(s => s.run_id as number);
      Promise.all(runIds.map(id => api.get<{ run: PipelineRun }>(`/runs/${id}`))).then(results => {
        const map: Record<number, PipelineRun> = {};
        results.forEach(r => { map[r.run.id] = r.run; });
        setPipelineRuns(map);
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [flowId, flowRunId, projectId]);

  useEffect(() => {
    if (!flowRun || flowRun.status !== 'running') return;
    const interval = setInterval(() => {
      api.get<FlowRun>(`/flows/runs/${flowRunId}`).then(run => {
        const parsed = { ...run, step_results: typeof run.step_results === 'string' ? JSON.parse(run.step_results as unknown as string || '{}') : (run.step_results ?? {}) };
        setFlowRun(parsed);
        if (run.status !== 'running') clearInterval(interval);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [flowRun?.status, flowRunId, flowRun]);

  const toggleExpand = (key: string, runId?: number | null) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); }
      else {
        next.add(key);
        if (runId && !transferLogs[runId]) {
          api.get<{ logs: TransferLogEntry[] }>(`/runs/${runId}`).then(data => {
            setTransferLogs(prev2 => ({ ...prev2, [runId]: data.logs ?? [] }));
          }).catch(() => {});
        }
      }
      return next;
    });
  };

  if (loading) return <Box sx={sx.loadingContainer}><CircularProgress /></Box>;
  if (!flowRun) return <Box sx={{ p: 3 }}><Typography color="error">Flow run not found</Typography></Box>;

  const pMap = new Map(pipelines.map(p => [p.id, p]));
  const duration = formatDuration(flowRun.started_at, flowRun.completed_at);
  const progress = flowRun.total_steps > 0 ? ((flowRun.completed_steps + flowRun.failed_steps) / flowRun.total_steps) * 100 : 0;
  const sortedSteps = Object.entries(flowRun.step_results).sort((a, b) => (a[1].started_at ?? 'z').localeCompare(b[1].started_at ?? 'z'));

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(`${basePath}/flows/${flowId}`)} size="small" aria-label="Back to flow"><BackIcon fontSize="small" /></IconButton>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h5" fontWeight={700}>Flow Run #{flowRun.id}</Typography>
            <Chip label={flowRun.status.replace(/_/g, ' ')} size="small" sx={sx.statusChip(flowRun.status, statusHex)} />
            <Tooltip title="Delete this run">
              <IconButton size="small" onClick={() => { api.del(`/flows/runs/${flowRunId}`).then(() => navigate(`${basePath}/flows/${flowId}`)); }} sx={sx.deleteButton}>
                <TrashIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{flowName}</Typography>
            <Typography variant="body2" color="text.disabled">Started: {new Date(flowRun.started_at).toLocaleString()}</Typography>
            {flowRun.completed_at && <Typography variant="body2" color="text.disabled">Duration: {duration}</Typography>}
          </Stack>
        </Box>
      </Stack>

      {flowRun.status === 'running' && <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, height: 6, borderRadius: 3, bgcolor: 'action.hover' }} />}

      <Box sx={sx.statsGrid}>
        {[
          { label: 'Total Steps', value: flowRun.total_steps },
          { label: 'Completed', value: flowRun.completed_steps, color: statusHex('completed') },
          { label: 'Failed', value: flowRun.failed_steps, color: statusHex('failed') },
          { label: 'Duration', value: duration },
        ].map((card, i) => (
          <Box key={i} sx={sx.statCard}>
            <Typography sx={sx.statLabel}>{card.label}</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: card.color ?? 'text.primary', mt: 0.5 }}>{card.value}</Typography>
          </Box>
        ))}
      </Box>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Steps ({sortedSteps.length})</Typography>
      <Stack spacing={1}>
        {sortedSteps.map(([pipelineId, step]) => {
          const pipeline = pMap.get(Number(pipelineId));
          const tags = pipeline ? parseTags(pipeline.tags) : [];
          const pRun = step.run_id ? pipelineRuns[step.run_id] : null;
          const isExpanded = expanded.has(pipelineId);
          const stepDuration = step.started_at && step.completed_at ? formatDuration(step.started_at, step.completed_at) : step.status === 'running' ? 'running...' : '—';

          return (
            <Box key={pipelineId} sx={sx.stepCard(step.status === 'failed')}>
              <Box onClick={() => toggleExpand(pipelineId, step.run_id)} sx={sx.stepRow}>
                {statusIcon(step.status)}
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{pipeline?.name ?? `Pipeline ${pipelineId}`}</Typography>
                    {tags.map(tag => <Chip key={tag} label={tag} size="small" sx={sx.stepTag} />)}
                  </Stack>
                  {step.error && step.status === 'failed' && <Typography sx={{ fontSize: 11, color: 'error.main', mt: 0.3 }}>{step.error}</Typography>}
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', mr: 1 }}>{stepDuration}</Typography>
                {pRun && <Typography sx={{ fontSize: 12, color: 'text.secondary', mr: 1 }}>{pRun.processed_records.toLocaleString()} records</Typography>}
                {step.run_id && <Chip label={`Run #${step.run_id}`} size="small" onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/runs/${step.run_id}`); }} sx={sx.stepRunChip} />}
                <IconButton size="small" aria-label={isExpanded ? 'Collapse step details' : 'Expand step details'} sx={sx.expandButton(isExpanded)}>
                  <ChevronDownIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
              <Collapse in={isExpanded}>
                <Box sx={sx.detailPanel}>
                  <Box sx={sx.detailGrid}>
                    <Box><Typography sx={sx.detailLabel}>Started</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{step.started_at ? new Date(step.started_at).toLocaleString() : '—'}</Typography></Box>
                    <Box><Typography sx={sx.detailLabel}>Completed</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{step.completed_at ? new Date(step.completed_at).toLocaleString() : '—'}</Typography></Box>
                    <Box><Typography sx={sx.detailLabel}>Duration</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{stepDuration}</Typography></Box>
                  </Box>
                  {pRun && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                      <Box><Typography sx={sx.detailLabel}>Total Records</Typography><Typography sx={{ fontSize: 14, fontWeight: 600 }}>{pRun.total_records.toLocaleString()}</Typography></Box>
                      <Box><Typography sx={sx.detailLabel}>Processed</Typography><Typography sx={{ fontSize: 14, fontWeight: 600, color: statusHex('completed') }}>{pRun.processed_records.toLocaleString()}</Typography></Box>
                      <Box><Typography sx={sx.detailLabel}>Failed</Typography><Typography sx={{ fontSize: 14, fontWeight: 600, color: pRun.failed_records > 0 ? statusHex('failed') : 'text.secondary' }}>{pRun.failed_records.toLocaleString()}</Typography></Box>
                    </Box>
                  )}
                  {(() => {
                    const rid = step.run_id;
                    const logs = rid !== null && rid !== undefined ? transferLogs[rid] : undefined;
                    if (!logs || logs.length === 0) return null;
                    return (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography sx={{ ...sx.detailLabel as object, mb: 0.5 }}>Transfer Log ({logs.length} entities)</Typography>
                        {logs.map((log, i) => {
                          const records = log.records_transferred || (log.source_id ? parseInt(log.source_id.match(/\d+/)?.[0] ?? '0') : 0);
                          const connId = pRun?.dest_connection_id;
                          return (
                            <Stack key={i} direction="row" spacing={2} alignItems="center" sx={sx.transferLogRow(i >= logs.length - 1, !!connId)} onClick={() => { if (connId) { setPreviewConnId(connId); setPreviewTable(log.dest_table); } }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{log.dest_table}</Typography>
                              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{records > 0 ? records.toLocaleString() : '—'}</Typography>
                              <Chip label={log.status ?? 'transferred'} size="small" sx={sx.transferLogChip(log.status, statusHex)} />
                            </Stack>
                          );
                        })}
                      </Box>
                    );
                  })()}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Stack>

      <DataPreviewDialog open={previewTable !== ''} onClose={() => setPreviewTable('')} connectionId={previewConnId} tableName={previewTable} />
    </Box>
  );
}

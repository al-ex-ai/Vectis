import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Box, CircularProgress, IconButton, Tooltip, Button, Stack,
  Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItemButton, ListItemText,
  Slider, ToggleButton, ToggleButtonGroup, useTheme,
} from '@mui/material';
import {
  ReactFlow, Background, MiniMap, Panel,
  type Node, type Edge, type Connection, type ReactFlowInstance,
  MarkerType, useNodesState, useEdgesState, addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@services/api';
import {
  BackIcon, PlayIcon, EditPenIcon, SaveIcon, PlusIcon,
  ZoomInIcon, ZoomOutIcon, FitViewIcon, RefreshIcon,
} from '@components/icons';
import PipelineNode from '@components/PipelineNode';
import type { PipelineNodeData } from '@components/PipelineNode';
import { getStatusColor, statusHex, getCanvasColors } from '@theme/constants';
import { useThemeMode } from '@theme/useThemeMode';
import * as sx from './FlowDesigner.styles';

interface FlowStep { pipeline_id: number; x: number; y: number; depends_on: number[] }
interface StepResult { status: string; run_id: number | null; error: string | null; started_at: string | null; completed_at: string | null }
interface Flow { id: number; name: string; description: string; status: string; steps: FlowStep[] }
interface FlowRun { id: number; flow_id: number; status: string; total_steps: number; completed_steps: number; failed_steps: number; started_at: string; completed_at: string | null; step_results: Record<string, StepResult> }
interface Pipeline { id: number; name: string; tags: string[]; source_connection_id: number; dest_connection_id: number }
const nodeTypes = { pipelineNode: PipelineNode };

function stepsFromGraph(nodes: Node[], edges: Edge[]): FlowStep[] {
  return nodes.filter(n => n.type === 'pipelineNode').map(n => ({
    pipeline_id: Number(n.id),
    x: n.position.x,
    y: n.position.y,
    depends_on: edges.filter(e => e.target === n.id).map(e => Number(e.source)),
  }));
}

// ── Main Component ───────────────────────────────────────────────────

export default function FlowDesigner() {
  const { flowId, projectId } = useParams<{ flowId: string; projectId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode: themeMode } = useThemeMode();
  const isDark = theme.palette.mode === 'dark';
  const canvas = getCanvasColors(themeMode);
  const basePath = projectId ? `/projects/${projectId}` : '';
  const [flow, setFlow] = useState<Flow | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRun, setActiveRun] = useState<FlowRun | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [designMode, setDesignMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [runMode, setRunMode] = useState<'parallel' | 'sequential'>('parallel');
  const [maxConcurrent, setMaxConcurrent] = useState(2);
  const [staggerDelay, setStaggerDelay] = useState(3);
  const [flowRuns, setFlowRuns] = useState<FlowRun[]>([]);

  const handleViewRun = useCallback((runId: number) => {
    navigate(`${basePath}/runs/${runId}`);
  }, [navigate, basePath]);

  const handleDeleteNode = useCallback((pipelineId: number) => {
    setNodes(ns => ns.filter(n => n.id !== String(pipelineId)));
    setEdges(es => es.filter(e => e.source !== String(pipelineId) && e.target !== String(pipelineId)));
    setDirty(true);
  }, [setNodes, setEdges]);

  // Load flow and pipelines
  useEffect(() => {
    Promise.all([
      api.get<Flow>(`/flows/${flowId}`),
      api.get<Pipeline[]>(`/pipelines?project_id=${projectId ?? 1}`),
    ]).then(([f, p]) => {
      setFlow(f);
      setPipelines(p);
      api.get<FlowRun[]>(`/flows/${flowId}/runs`).then(runs => {
        const running = runs.find(r => r.status === 'running');
        if (running) setActiveRun(running);
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [flowId, projectId]);

  // Build graph
  useEffect(() => {
    if (!flow?.steps || pipelines.length === 0) return;
    const pMap = new Map(pipelines.map(p => [p.id, p]));
    const stepResults = activeRun?.step_results ?? null;
    const ns: Node[] = [];
    const es: Edge[] = [];

    for (const step of flow.steps) {
      const pipeline = pMap.get(step.pipeline_id);
      if (!pipeline) continue;
      ns.push({
        id: String(step.pipeline_id),
        type: 'pipelineNode',
        position: { x: step.x, y: step.y },
        data: {
          pipeline, tags: pipeline.tags,
          stepResult: stepResults?.[String(step.pipeline_id)] ?? null,
          onDelete: handleDeleteNode, onViewRun: handleViewRun, designMode, isDark,
        },
      });
      for (const depId of step.depends_on ?? []) {
        const depResult = stepResults?.[String(depId)];
        const ds = depResult?.status ?? 'pending';
        const color = statusHex(ds);
        es.push({
          id: `${depId}->${step.pipeline_id}`,
          source: String(depId), target: String(step.pipeline_id),
          type: 'smoothstep', animated: true,
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
        });
      }
    }
    setNodes(ns);
    setEdges(es);
  }, [flow, pipelines, activeRun, designMode, isDark, handleDeleteNode, handleViewRun, setNodes, setEdges]);

  // Poll active run
  useEffect(() => {
    if (!activeRun || activeRun.status !== 'running') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      api.get<FlowRun>(`/flows/runs/${activeRun.id}`).then(run => {
        setActiveRun(run);
        if (run.status !== 'running' && pollRef.current) clearInterval(pollRef.current);
      }).catch(console.error);
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRun?.id, activeRun?.status, activeRun]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!designMode) return;
    setEdges(eds => addEdge({
      ...connection, type: 'smoothstep', animated: true,
      style: { stroke: statusHex('pending'), strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: statusHex('pending'), width: 16, height: 16 },
    }, eds));
    setDirty(true);
  }, [designMode, setEdges]);

  const handleAddPipeline = useCallback((pipeline: Pipeline) => {
    if (nodes.find(n => n.id === String(pipeline.id))) return;
    const newNode: Node = {
      id: String(pipeline.id), type: 'pipelineNode',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 },
      data: { pipeline, tags: pipeline.tags, stepResult: null, onDelete: handleDeleteNode, designMode: true, isDark },
    };
    setNodes(ns => [...ns, newNode]);
    setDirty(true);
    setShowPicker(false);
  }, [nodes, setNodes, isDark, handleDeleteNode]);

  const handleSaveFlow = useCallback(() => {
    const steps = stepsFromGraph(nodes, edges);
    api.put(`/flows/${flowId}`, { steps }).then(f => {
      setFlow(f as Flow);
      setDirty(false);
    }).catch(console.error);
  }, [flowId, nodes, edges]);

  const handleNodesChange: typeof onNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    if (designMode && changes.some(c => c.type === 'position' && 'dragging' in c && !c.dragging)) {
      setDirty(true);
    }
  }, [onNodesChange, designMode]);

  const handleRunConfirm = useCallback(() => {
    setShowRunDialog(false);
    api.post<FlowRun>(`/flows/${flowId}/run`, {
      mode: runMode, max_concurrent: maxConcurrent, stagger_delay: staggerDelay,
    }).then(res => {
      setDesignMode(false);
      setActiveRun({
        id: res.id, flow_id: Number(flowId), status: 'running',
        total_steps: flow?.steps?.length ?? 0, completed_steps: 0, failed_steps: 0,
        started_at: res.started_at ?? new Date().toISOString(), completed_at: null, step_results: {},
      });
    }).catch(console.error);
  }, [flowId, flow, runMode, maxConcurrent, staggerDelay]);

  const handleCancel = useCallback(() => {
    if (!activeRun) return;
    api.post(`/flows/runs/${activeRun.id}/cancel`).then(() => {
      api.get<FlowRun>(`/flows/runs/${activeRun.id}`).then(run => setActiveRun(run)).catch(() => {
        setActiveRun(prev => prev ? { ...prev, status: 'cancelled' } : null);
      });
    }).catch(console.error);
  }, [activeRun]);

  const handleSaveEdit = () => {
    api.put(`/flows/${flowId}`, { name: editName, description: editDesc }).then(f => {
      setFlow(f as Flow);
      setEditOpen(false);
    });
  };

  const handleZoomIn = useCallback(() => rfRef.current?.zoomIn({ duration: 200 }), []);
  const handleZoomOut = useCallback(() => rfRef.current?.zoomOut({ duration: 200 }), []);
  const handleFitView = useCallback(() => rfRef.current?.fitView({ padding: 0.2, duration: 300 }), []);

  if (loading) return <Box sx={sx.loadingContainer}><CircularProgress /></Box>;
  if (!flow) return <Box sx={{ p: 3 }}><Typography color="error">Flow not found</Typography></Box>;

  const isRunning = activeRun?.status === 'running';
  const runStatus = activeRun?.status;
  const usedPipelineIds = new Set(nodes.map(n => Number(n.id)));
  const availablePipelines = pipelines.filter(p => !usedPipelineIds.has(p.id));
  const sc = (s: string) => getStatusColor(s, isDark);

  return (
    <Box sx={sx.pageWrapper}>
      {/* Toolbar */}
      <Box sx={sx.toolbar}>
        <IconButton onClick={() => navigate(`${basePath}/flows`)} size="small" sx={{ color: 'text.secondary' }} aria-label="Back to flows">
          <BackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ mr: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary' }}>{flow.name}</Typography>
          {flow.description && <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>{flow.description}</Typography>}
        </Box>
        <Tooltip title="Edit name"><IconButton size="small" aria-label="Edit flow name" onClick={() => { setEditName(flow.name); setEditDesc(flow.description ?? ''); setEditOpen(true); }}><EditPenIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Button variant={designMode ? 'contained' : 'outlined'} size="small" onClick={() => setDesignMode(d => !d)} sx={{ fontSize: 11, minWidth: 80 }}>
          {designMode ? 'Designing' : 'Design'}
        </Button>
        {designMode && (
          <>
            <Button variant="outlined" size="small" startIcon={<PlusIcon sx={{ fontSize: 14 }} />} onClick={() => setShowPicker(true)} sx={{ fontSize: 11 }}>Add Pipeline</Button>
            {dirty && <Button variant="contained" size="small" color="warning" startIcon={<SaveIcon sx={{ fontSize: 14 }} />} onClick={handleSaveFlow} sx={{ fontSize: 11 }}>Save</Button>}
          </>
        )}
        {runStatus && runStatus !== 'pending' && !designMode && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip label={runStatus.replace(/_/g, ' ')} size="small" sx={sx.runStatusChip(sc(runStatus === 'completed_with_errors' ? 'failed' : runStatus).border, sc(runStatus === 'completed_with_errors' ? 'failed' : runStatus).text)} />
            {activeRun && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{activeRun.completed_steps}/{activeRun.total_steps} steps{activeRun.failed_steps > 0 ? ` (${activeRun.failed_steps} failed)` : ''}</Typography>}
          </Stack>
        )}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.25 }}>
          <Tooltip title="Zoom In"><IconButton size="small" aria-label="Zoom in" onClick={handleZoomIn}><ZoomInIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Zoom Out"><IconButton size="small" aria-label="Zoom out" onClick={handleZoomOut}><ZoomOutIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Fit View"><IconButton size="small" aria-label="Fit view" onClick={handleFitView}><FitViewIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />
        <Button variant="outlined" size="small" onClick={() => {
          api.get<FlowRun[]>(`/flows/${flowId}/runs`).then(runs => {
            setFlowRuns(runs.map(r => ({ ...r, step_results: typeof r.step_results === 'string' ? JSON.parse(r.step_results as unknown as string || '{}') : (r.step_results ?? {}) })));
            setShowHistory(true);
          });
        }} startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: 12 }}>History</Button>
        {isRunning ? (
          <Button variant="outlined" color="error" size="small" onClick={handleCancel} sx={{ fontSize: 12 }}>Cancel</Button>
        ) : (
          <Button variant="contained" size="small" color="success" startIcon={<PlayIcon sx={{ fontSize: 14 }} />} onClick={() => setShowRunDialog(true)} disabled={designMode || !flow.steps?.length} sx={{ fontSize: 12 }}>Run Flow</Button>
        )}
      </Box>

      {/* Flow Canvas */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
          onConnect={handleConnect} nodeTypes={nodeTypes}
          onInit={instance => { rfRef.current = instance; }}
          fitView fitViewOptions={{ padding: 0.3 }} minZoom={0.3} maxZoom={2}
          nodesDraggable={designMode} nodesConnectable={designMode} elementsSelectable={designMode}
          deleteKeyCode={designMode ? ['Backspace', 'Delete'] : []}
          proOptions={{ hideAttribution: true }}
          style={{ background: canvas.background }}
        >
          <Background color={canvas.grid} gap={canvas.dotGap} />
          <MiniMap
            nodeColor={n => { const result = (n.data as PipelineNodeData)?.stepResult; return getStatusColor(result?.status ?? 'pending', isDark).border; }}
            maskColor={canvas.minimapMask} style={{ backgroundColor: canvas.minimapBg }}
          />
          {nodes.length === 0 && (
            <Panel position="top-center">
              <Box sx={sx.emptyCanvas}>
                <Typography sx={{ fontSize: 16, mb: 1 }}>No pipelines in this flow</Typography>
                <Button variant="outlined" size="small" startIcon={<PlusIcon sx={{ fontSize: 14 }} />} onClick={() => { setDesignMode(true); setShowPicker(true); }}>Add pipelines to get started</Button>
              </Box>
            </Panel>
          )}
        </ReactFlow>
      </Box>

      {/* Pipeline Picker */}
      <Dialog open={showPicker} onClose={() => setShowPicker(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Pipeline</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {availablePipelines.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">All pipelines are already in this flow</Typography></Box>
          ) : (
            <List>
              {availablePipelines.map(p => (
                <ListItemButton key={p.id} onClick={() => handleAddPipeline(p)}>
                  <ListItemText primary={p.name} secondary={<Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>{p.tags.map(t => <Chip key={t} label={t} size="small" sx={sx.tagChip} />)}</Stack>} />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setShowPicker(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Run History */}
      <Dialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Flow Run History</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {flowRuns.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">No runs yet</Typography></Box>
          ) : (
            <List>
              {flowRuns.map(run => {
                const dur = run.completed_at ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s` : 'running...';
                return (
                  <ListItemButton key={run.id} onClick={() => { setShowHistory(false); navigate(`${basePath}/flows/${flowId}/runs/${run.id}`); }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Run #{run.id}</Typography>
                        <Chip label={run.status.replace(/_/g, ' ')} size="small" sx={sx.historyChip(statusHex(run.status))} />
                      </Stack>
                      <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{new Date(run.started_at).toLocaleString()} · {run.completed_steps}/{run.total_steps} steps · {dur}</Typography>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setShowHistory(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Run Flow Dialog */}
      <Dialog open={showRunDialog} onClose={() => setShowRunDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Run Flow</DialogTitle>
        <DialogContent>
          <Typography sx={sx.sectionLabel}>Execution Mode</Typography>
          <ToggleButtonGroup value={runMode} exclusive onChange={(_, v) => { if (v) setRunMode(v); }} fullWidth size="small" sx={sx.toggleGroup}>
            <ToggleButton value="parallel">Parallel</ToggleButton>
            <ToggleButton value="sequential">Sequential</ToggleButton>
          </ToggleButtonGroup>
          {runMode === 'parallel' ? (
            <>
              <Typography sx={sx.sectionLabel}>Max Concurrent</Typography>
              <Slider value={maxConcurrent} onChange={(_, v) => setMaxConcurrent(v as number)} min={1} max={4} step={1} marks={[{value:1,label:'1'},{value:2,label:'2'},{value:3,label:'3'},{value:4,label:'4'}]} sx={{ mb: 2.5 }} />
              <Typography sx={sx.sectionLabel}>Stagger Delay (sec)</Typography>
              <Slider value={staggerDelay} onChange={(_, v) => setStaggerDelay(v as number)} min={0} max={10} step={1} marks={[{value:0,label:'0'},{value:5,label:'5'},{value:10,label:'10'}]} sx={{ mb: 2 }} />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Pipelines run one at a time following dependency order.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRunDialog(false)}>Cancel</Button>
          <Button onClick={handleRunConfirm} variant="contained" color="success" startIcon={<PlayIcon sx={{ fontSize: 14 }} />}>Start</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Flow Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Flow</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={editName} onChange={e => setEditName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

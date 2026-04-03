import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { PlusIcon, PlayIcon, EditPenIcon, TrashIcon, PipelinesIcon, FlowsIcon } from '@components/icons';
import { api } from '@services/api';
import { statusHex } from '@theme/constants';

interface Flow {
  id: number;
  name: string;
  description: string;
  status: string;
  steps: Array<{ pipeline_id: number; depends_on: number[] }>;
  created_at: string;
}

interface FlowRun {
  id: number;
  status: string;
  completed_steps: number;
  total_steps: number;
  started_at: string;
}

export default function Flows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [lastRuns, setLastRuns] = useState<Record<number, FlowRun | null>>({});
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '';

  const loadFlows = () => {
    setLoading(true);
    const query = projectId ? `?project_id=${projectId}` : '';
    api
      .get<Flow[]>(`/flows${query}`)
      .then((data) => {
        const parsed = data.map((f) => ({
          ...f,
          steps:
            typeof f.steps === 'string'
              ? JSON.parse((f.steps as string) || '[]')
              : f.steps ?? [],
        }));
        setFlows(parsed);
        parsed.forEach((f) => {
          api
            .get<FlowRun[]>(`/flows/${f.id}/runs`)
            .then((runs) => {
              setLastRuns((prev) => ({ ...prev, [f.id]: runs.length > 0 ? runs[0] : null }));
            })
            .catch(() => {});
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFlows();
  }, [projectId]);

  const handleCreate = () => {
    api
      .post('/flows', {
        name: newName,
        description: newDesc,
        project_id: Number(projectId) || 1,
      })
      .then(() => {
        setCreateOpen(false);
        setNewName('');
        setNewDesc('');
        loadFlows();
      });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    api.del(`/flows/${deleteId}`).then(() => {
      setDeleteId(null);
      loadFlows();
    });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Flows
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pipeline orchestration — chain pipelines with dependencies
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusIcon />} onClick={() => setCreateOpen(true)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          Create Flow
        </Button>
        <IconButton color="primary" onClick={() => setCreateOpen(true)} sx={{ display: { xs: 'inline-flex', sm: 'none' }, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, width: 34, height: 34 }}>
          <PlusIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : flows.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <FlowsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No flows yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a flow to orchestrate multiple pipelines
          </Typography>
          <Button variant="outlined" startIcon={<PlusIcon />} onClick={() => setCreateOpen(true)}>
            Create your first flow
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(340px, 1fr))' },
            gap: 2,
          }}
        >
          {flows.map((flow) => {
            const run = lastRuns[flow.id];
            return (
              <Card
                key={flow.id}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`${basePath}/flows/${flow.id}`)}
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
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {flow.name}
                    </Typography>
                    <Chip
                      label={flow.status}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        flexShrink: 0,
                        bgcolor: flow.status === 'active' ? 'success.main' : 'action.hover',
                        color:
                          flow.status === 'active' ? 'success.contrastText' : 'text.disabled',
                      }}
                    />
                  </Stack>

                  <Box sx={{ minHeight: 36, mt: 0.5 }}>
                    {flow.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {flow.description}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip
                      icon={<PipelinesIcon sx={{ fontSize: '14px !important' }} />}
                      label={`${flow.steps.length} pipelines`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    />
                    {run && (
                      <Chip
                        label={`Last: ${run.status.replace('_', ' ')}`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          bgcolor: statusHex(run.status) + '22',
                          color: statusHex(run.status),
                        }}
                      />
                    )}
                  </Stack>

                  <Box sx={{ flex: 1 }} />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      Created {new Date(flow.created_at).toLocaleDateString()}
                    </Typography>
                    <Stack direction="row" spacing={0.25} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Open" arrow>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`${basePath}/flows/${flow.id}`)}
                          sx={{ color: 'success.main' }}
                          aria-label={`Open ${flow.name}`}
                        >
                          <PlayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit" arrow>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`${basePath}/flows/${flow.id}`)}
                          sx={{ color: 'text.secondary' }}
                          aria-label={`Edit ${flow.name}`}
                        >
                          <EditPenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteId(flow.id)}
                          sx={{ color: 'error.main' }}
                          aria-label={`Delete ${flow.name}`}
                        >
                          <TrashIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Flow</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Flow</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete this flow and all its run history. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

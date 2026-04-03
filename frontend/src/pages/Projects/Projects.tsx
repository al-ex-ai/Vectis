import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import { PlusIcon, EditPenIcon, TrashIcon } from '@components/icons';
import { api } from '@services/api';
import Toast from '@components/Toast';
import { fmtTs } from '@utils/formatters';
import { MESSAGES } from '@utils/constants';
import type { Project } from '@typedefs/index';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info',
  });
  const navigate = useNavigate();

  const loadProjects = () =>
    api
      .get<Project[]>('/projects')
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProjects();
  }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (proj: Project) => {
    setEditId(proj.id);
    setForm({ name: proj.name, description: proj.description ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.put(`/projects/${editId}`, form);
        setToast({ open: true, message: MESSAGES.SAVE_SUCCESS, severity: 'success' });
      } else {
        await api.post('/projects', form);
        setToast({ open: true, message: 'Project created', severity: 'success' });
      }
      setDialogOpen(false);
      loadProjects();
    } catch (e) {
      setToast({ open: true, message: String(e), severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE)) return;
    try {
      const res = await api.del<{ success?: boolean; error?: string }>(`/projects/${id}`);
      if (res.error) {
        setToast({ open: true, message: res.error, severity: 'error' });
      } else {
        setToast({ open: true, message: MESSAGES.DELETE_SUCCESS, severity: 'success' });
        loadProjects();
      }
    } catch (e) {
      setToast({ open: true, message: String(e), severity: 'error' });
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize your pipelines into projects
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusIcon />} onClick={openAdd} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          New Project
        </Button>
        <IconButton color="primary" onClick={openAdd} sx={{ display: { xs: 'inline-flex', sm: 'none' }, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, width: 34, height: 34 }}>
          <PlusIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      {projects.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <ProjectsEmptyState />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {projects.map((proj) => (
            <Grid key={proj.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'divider',
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
                onClick={() => navigate(`/projects/${proj.id}`)}
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {proj.name}
                  </Typography>

                  <Box sx={{ minHeight: 36, mt: 0.5 }}>
                    {proj.description && (
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
                        {proj.description}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip
                      label={`${proj.pipeline_count ?? 0} pipelines`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    />
                    {(proj.active_runs ?? 0) > 0 && (
                      <Chip
                        label={`${proj.active_runs} running`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          bgcolor: 'info.main',
                          color: 'info.contrastText',
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
                      {fmtTs(proj.created_at)}
                    </Typography>
                    <Stack direction="row" spacing={0.25} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit" arrow>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(proj)}
                          aria-label={`Edit ${proj.name}`}
                        >
                          <EditPenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(proj.id)}
                          sx={{ color: 'error.main' }}
                          aria-label={`Delete ${proj.name}`}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Project' : 'New Project'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim()}>
            {editId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </Box>
  );
}

function ProjectsEmptyState() {
  return (
    <>
      <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
        Get started by creating your first project
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
        Projects help you organize pipelines and connections
      </Typography>
    </>
  );
}

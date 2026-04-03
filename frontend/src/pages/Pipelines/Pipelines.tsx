import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from '@mui/material';
import { PlusIcon, TrashIcon, EditPenIcon, PlayIcon, PipelinesIcon } from '@components/icons';
import Toast from '@components/Toast';
import PipelineFormDialog, { type PipelineFormData } from '@components/PipelineFormDialog';
import { api } from '@services/api';
import { MESSAGES } from '@utils/constants';
import { fmtTs } from '@utils/formatters';
import type { Pipeline, Connection } from '@typedefs/index';

function parseTags(tags?: string | string[]): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

const emptyForm = (): PipelineFormData => ({
  name: '',
  description: '',
  source_connection_id: '',
  dest_connection_id: '',
  dest_schema: 'dbo',
  status: '',
  tags: '',
});

export default function Pipelines() {
  const [pipes, setPipes] = useState<Pipeline[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PipelineFormData>(emptyForm());
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info',
  });
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '';

  const handleRun = async (pipelineId: number) => {
    try {
      const result = await api.post<{ success?: boolean; error?: string; run_id?: number }>(
        `/pipelines/${pipelineId}/run`,
      );
      if (result.error) {
        setToast({ open: true, message: result.error, severity: 'error' });
      } else {
        navigate(`${basePath}/runs/${result.run_id}`);
      }
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to start run',
        severity: 'error',
      });
    }
  };

  const load = useCallback(() => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    Promise.all([
      api.get<Pipeline[]>(`/pipelines${qs}`).then(setPipes),
      api.get<Connection[]>('/connections').then(setConns),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    pipes.forEach((p) => parseTags(p.tags).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [pipes]);

  const filteredPipes = useMemo(() => {
    if (!activeTag) return pipes;
    return pipes.filter((p) => parseTags(p.tags).includes(activeTag));
  }, [pipes, activeTag]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: Pipeline) => {
    setEditingId(p.id);
    const tags = parseTags(p.tags);
    setForm({
      name: p.name,
      description: p.description,
      source_connection_id: String(p.source_connection_id),
      dest_connection_id: String(p.dest_connection_id),
      dest_schema: p.dest_schema ?? 'dbo',
      status: p.status,
      tags: tags.join(', '),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const tagsArray = form.tags
      ? form.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const payload = { ...form, tags: tagsArray };
    try {
      if (editingId) {
        await api.put(`/pipelines/${editingId}`, payload);
        setDialogOpen(false);
        load();
      } else {
        const body = projectId ? { ...payload, project_id: projectId } : payload;
        const result = await api.post<{ success: boolean; id: number }>('/pipelines', body);
        if (result.success) {
          setDialogOpen(false);
          navigate(`${basePath}/pipelines/${result.id}`);
        }
      }
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
    await api.del(`/pipelines/${id}`);
    load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Pipelines
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ETL pipeline configurations
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusIcon />} onClick={openCreate} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          Create Pipeline
        </Button>
        <IconButton color="primary" onClick={openCreate} sx={{ display: { xs: 'inline-flex', sm: 'none' }, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, width: 34, height: 34 }}>
          <PlusIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {allTags.length > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.75 }}>
          <Chip
            label="All"
            size="small"
            variant={activeTag === null ? 'filled' : 'outlined'}
            onClick={() => setActiveTag(null)}
            sx={{ fontWeight: 500 }}
          />
          {allTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              color={activeTag === tag ? 'primary' : 'default'}
              variant={activeTag === tag ? 'filled' : 'outlined'}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              sx={{ fontWeight: 500, textTransform: 'capitalize' }}
            />
          ))}
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredPipes.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <PipelinesIcon sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" gutterBottom>
            {activeTag ? 'No pipelines match this filter' : 'No pipelines configured yet'}
          </Typography>
          <Typography variant="body2">
            {activeTag
              ? 'Try a different tag or clear the filter'
              : 'Create your first pipeline to start moving data'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredPipes.map((p) => {
            const tags = parseTags(p.tags);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
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
                  onClick={() => navigate(`${basePath}/pipelines/${p.id}`)}
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
                        {p.name}
                      </Typography>
                      <Chip
                        label={p.status}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          flexShrink: 0,
                          bgcolor:
                            p.status === 'active'
                              ? 'success.main'
                              : p.status === 'draft'
                                ? 'warning.main'
                                : 'action.hover',
                          color:
                            p.status === 'active'
                              ? 'success.contrastText'
                              : p.status === 'draft'
                                ? 'warning.contrastText'
                                : 'text.disabled',
                        }}
                      />
                    </Stack>

                    <Box sx={{ minHeight: 36, mt: 0.5 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.4 }}
                      >
                        {p.source_name} → {p.dest_name}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      {tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                          }}
                        />
                      ))}
                    </Stack>

                    <Box sx={{ flex: 1 }} />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        {p.created_at ? fmtTs(p.created_at) : ''}
                      </Typography>
                      <Stack direction="row" spacing={0.25} onClick={(e) => e.stopPropagation()}>
                        {p.status === 'active' && (
                          <Tooltip title="Run" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleRun(p.id)}
                              sx={{ color: 'success.main' }}
                              aria-label={`Run ${p.name}`}
                            >
                              <PlayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit" arrow>
                          <IconButton
                            size="small"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                          >
                            <EditPenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(p.id)}
                            sx={{ color: 'error.main' }}
                            aria-label={`Delete ${p.name}`}
                          >
                            <TrashIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <PipelineFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        form={form}
        connections={conns}
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

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { EditPenIcon, TrashIcon, PlayIcon, PlusIcon, ConnectionsIcon } from '@components/icons';
import { api } from '@services/api';
import Toast from '@components/Toast';
import ConnectionFormDialog, { type ConnectionFormData } from '@components/ConnectionFormDialog';
import { fmtTs } from '@utils/formatters';
import { TYPE_LABELS, API_TYPES, SQL_TYPES, MESSAGES } from '@utils/constants';
import type { Connection } from '@typedefs/index';

const emptyForm = (): ConnectionFormData => ({
  name: '',
  type: '',
  description: '',
  connection_string: '',
  crm_base_url: '',
  crm_api_version: 'v9.2',
  crm_tenant_id: '',
  crm_client_id: '',
  crm_client_secret: '',
  sf_instance_url: '',
  sf_api_version: 'v59.0',
  sf_client_id: '',
  sf_client_secret: '',
  sf_username: '',
  sf_password: '',
});

export default function Connections() {
  const navigate = useNavigate();
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ConnectionFormData>(emptyForm());
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info',
  });

  const loadConns = () =>
    api
      .get<Connection[]>('/connections')
      .then(setConns)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    loadConns();
  }, []);

  const setField = (key: keyof ConnectionFormData, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    const conn = await api.get<Connection & { connection_string?: string }>(`/connections/${id}`);
    const f = emptyForm();
    f.name = conn.name;
    f.type = conn.type;
    f.description = conn.description ?? '';
    if (conn.type === 'dynamics_crm' && conn.config) {
      f.crm_base_url = conn.config.base_url ?? '';
      f.crm_api_version = conn.config.api_version ?? 'v9.2';
      f.crm_tenant_id = conn.config.tenant_id ?? '';
      f.crm_client_id = conn.config.client_id ?? '';
    } else if (conn.type === 'salesforce' && conn.config) {
      f.sf_instance_url = conn.config.instance_url ?? '';
      f.sf_api_version = conn.config.api_version ?? 'v59.0';
      f.sf_client_id = conn.config.client_id ?? '';
      f.sf_username = conn.config.username ?? '';
    } else if (!API_TYPES.has(conn.type)) {
      f.connection_string = conn.connection_string ?? '';
    }
    setEditId(id);
    setForm(f);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.put(`/connections/${editId}`, form);
      } else {
        await api.post('/connections', form);
      }
      setDialogOpen(false);
      loadConns();
      setToast({
        open: true,
        message: editId ? 'Connection updated' : 'Connection created',
        severity: 'success',
      });
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
    await api.del(`/connections/${id}`);
    loadConns();
  };

  const handleTest = async (id: number) => {
    setToast({ open: true, message: 'Testing connection...', severity: 'info' });
    try {
      const result = await api.get<{ success: boolean; error?: string }>(`/connections/${id}/test`);
      if (result.success) {
        setToast({ open: true, message: MESSAGES.CONNECTION_TEST_SUCCESS, severity: 'success' });
      } else {
        setToast({
          open: true,
          message: `${MESSAGES.CONNECTION_TEST_FAILED}: ${result.error}`,
          severity: 'error',
        });
      }
    } catch (err) {
      setToast({
        open: true,
        message: `Error: ${err instanceof Error ? err.message : err}`,
        severity: 'error',
      });
    }
  };

  const typeBadgeColor = (type: string) => {
    if (API_TYPES.has(type)) return 'secondary';
    return 'primary';
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Connections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure source and destination databases
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PlusIcon />} onClick={openAdd} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          Add Connection
        </Button>
        <IconButton color="primary" onClick={openAdd} sx={{ display: { xs: 'inline-flex', sm: 'none' }, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, width: 34, height: 34 }}>
          <PlusIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : conns.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <ConnectionsIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
            No connections configured yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Add a database or CRM connection to get started
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {conns.map((c) => (
            <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {c.name}
                    </Typography>
                    <Chip
                      label={TYPE_LABELS[c.type] ?? c.type}
                      size="small"
                      color={typeBadgeColor(c.type) as 'primary' | 'secondary'}
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}
                    />
                  </Stack>

                  <Box sx={{ minHeight: 36, mt: 0.5 }}>
                    {c.description && (
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
                        {c.description}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip
                      label={API_TYPES.has(c.type) ? 'API' : 'Database'}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    />
                  </Stack>

                  <Box sx={{ flex: 1 }} />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      {fmtTs(c.created_at)}
                    </Typography>
                    <Stack direction="row" spacing={0.25}>
                      {SQL_TYPES.has(c.type) && (
                        <Tooltip title="Schema Explorer" arrow>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/connections/${c.id}/schema`)}
                            aria-label={`Schema Explorer ${c.name}`}
                            sx={{ color: 'info.main' }}
                          >
                            <ConnectionsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Test connection" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleTest(c.id)}
                          aria-label={`Test ${c.name}`}
                          sx={{ color: 'success.main' }}
                        >
                          <PlayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit" arrow>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(c.id)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <EditPenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(c.id)}
                          aria-label={`Delete ${c.name}`}
                          sx={{ color: 'error.main' }}
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

      <ConnectionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        form={form}
        onChange={setField}
        onSave={handleSave}
        editing={!!editId}
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

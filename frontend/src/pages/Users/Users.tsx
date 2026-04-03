import { useCallback, useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  InputBase,
} from '@mui/material';
import { PlusIcon, EditPenIcon } from '@components/icons';
import Toast from '@components/Toast';
import { api } from '@services/api';
import { formatRelativeTime } from '@utils/formatters';
import { useAuthStore } from '@stores/useAuthStore';
import type { User } from '@typedefs/index';

const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

function roleColor(role: string): 'error' | 'warning' | 'primary' | 'default' {
  if (role === 'owner') return 'error';
  if (role === 'admin') return 'warning';
  if (role === 'editor') return 'primary';
  return 'default';
}

/** User management icon */
function UsersIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="19" cy="7" r="3" opacity="0.5" />
      <path d="M21 21v-1.5a3 3 0 00-3-3" opacity="0.5" />
    </svg>
  );
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteLink, setInviteLink] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });
  const currentUser = useAuthStore((s) => s.user);

  const load = useCallback(() => {
    api.get<User[]>('/auth/users')
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    try {
      const result = await api.post<{ invite_token: string; email: string; role: string }>('/auth/invite', {
        email: inviteEmail,
        role: inviteRole,
      });
      const link = `${window.location.origin}/register?token=${result.invite_token}&email=${encodeURIComponent(result.email)}`;
      setInviteLink(link);
      setToast({ open: true, message: 'Invite created', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: `Error: ${err instanceof Error ? err.message : err}`, severity: 'error' });
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    try {
      await api.put(`/auth/users/${editUser.id}`, {
        role: editRole,
        is_active: editActive,
      });
      setEditUser(null);
      setToast({ open: true, message: 'User updated', severity: 'success' });
      load();
    } catch (err) {
      setToast({ open: true, message: `Error: ${err instanceof Error ? err.message : err}`, severity: 'error' });
    }
  };

  const openEditDialog = (u: User) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditActive(u.is_active);
  };

  const canManage = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Team
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users and invite new members
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => { setInviteEmail(''); setInviteRole('editor'); setInviteLink(''); setInviteOpen(true); }}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Invite
          </Button>
        )}
        {canManage && (
          <IconButton
            color="primary"
            onClick={() => { setInviteEmail(''); setInviteRole('editor'); setInviteLink(''); setInviteOpen(true); }}
            sx={{ display: { xs: 'inline-flex', sm: 'none' }, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, width: 34, height: 34 }}
          >
            <PlusIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : users.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.secondary' }}>
          <UsersIcon style={{ fontSize: 64, marginBottom: 16, opacity: 0.4 }} />
          <Typography variant="h6" gutterBottom>No team members yet</Typography>
          <Typography variant="body2">Invite your first team member to get started</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {users.map((u) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={u.id}>
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: u.is_active ? 1 : 0.55,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: 4 },
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {u.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </Typography>
                    </Box>
                    <Chip
                      label={u.role}
                      size="small"
                      color={roleColor(u.role)}
                      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0, textTransform: 'capitalize' }}
                    />
                  </Stack>

                  {!u.is_active && (
                    <Chip label="Disabled" size="small" sx={{ mt: 1, height: 20, fontSize: '0.65rem', bgcolor: 'action.disabledBackground', color: 'text.disabled', alignSelf: 'flex-start' }} />
                  )}

                  <Box sx={{ flex: 1 }} />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      Joined {formatRelativeTime(u.created_at)}
                    </Typography>
                    {canManage && u.id !== currentUser?.id && (
                      <Tooltip title="Edit user" arrow>
                        <IconButton size="small" onClick={() => openEditDialog(u)} aria-label={`Edit ${u.name}`}>
                          <EditPenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Role"
              select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              fullWidth
            >
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
              ))}
            </TextField>
            {inviteLink && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Share this link with the user:
                </Typography>
                <InputBase
                  value={inviteLink}
                  readOnly
                  fullWidth
                  onClick={(e) => { (e.target as HTMLInputElement).select(); navigator.clipboard.writeText(inviteLink); }}
                  sx={{
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                />
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  Click to copy. Link expires in 7 days.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Close</Button>
          {!inviteLink && (
            <Button variant="contained" onClick={handleInvite} disabled={!inviteEmail}>
              Generate Invite
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editUser && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>{editUser.name}</Typography>
                <Typography variant="body2" color="text.secondary">{editUser.email}</Typography>
              </Box>
              <TextField
                label="Role"
                select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                fullWidth
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
                ))}
              </TextField>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Active</Typography>
                <Switch checked={editActive} onChange={(e) => setEditActive(e.target.checked)} color="primary" />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateUser}>Save</Button>
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

import { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Link,
  useTheme,
} from '@mui/material';
import { VectisIcon } from '@components/icons';
import { api } from '@services/api';
import { useAuthStore } from '@stores/useAuthStore';
import type { LoginResponse } from '@typedefs/index';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') ?? '';
  const inviteEmail = searchParams.get('email') ?? '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchMe, setToken } = useAuthStore();
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post<LoginResponse>('/auth/register', {
        email,
        password,
        name,
        invite_token: inviteToken,
      });
      setToken(resp.token);
      await fetchMe();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^HTTP \d+: /, '') : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!inviteToken) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: { xs: 2, sm: 3 },
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                Invite Required
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Registration is by invite only. Ask your team admin for an invite link.
              </Typography>
              <Link component={RouterLink} to="/login" underline="hover" sx={{ fontSize: '0.85rem' }}>
                Back to Sign In
              </Link>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${primary}, ${theme.palette.primary.dark})`,
              }}
            >
              <VectisIcon sx={{ width: 28, height: 28, color: '#fff' }} />
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700}>
                Create your account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Join your team on Vectis
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  autoComplete="name"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  disabled={!!inviteEmail}
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                  helperText="At least 6 characters"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || !name || !email || !password}
                  sx={{ py: 1.2, fontWeight: 600 }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </Stack>
            </Box>

            <Link component={RouterLink} to="/login" underline="hover" sx={{ fontSize: '0.85rem' }}>
              Already have an account? Sign in
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

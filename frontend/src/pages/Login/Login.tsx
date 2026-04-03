import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  useTheme,
} from '@mui/material';
import { VectisIcon } from '@components/icons';
import { api } from '@services/api';
import { useAuthStore } from '@stores/useAuthStore';
import { useDemoStore } from '@stores/useDemoStore';
import type { LoginResponse } from '@typedefs/index';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchMe, setToken } = useAuthStore();
  const { demoEmail, demoPassword, loaded: demoLoaded, fetchDemoMode } = useDemoStore();
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  useEffect(() => {
    if (!demoLoaded) fetchDemoMode();
  }, [demoLoaded, fetchDemoMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await api.post<LoginResponse>('/auth/login', { email, password });
      setToken(resp.token);
      await fetchMe();
      navigate('/', { replace: true });
    } catch (err) {
      let msg = 'Login failed';
      if (err instanceof Error) {
        const raw = err.message.replace(/^HTTP \d+: /, '');
        try { msg = JSON.parse(raw).detail ?? raw; } catch { msg = raw; }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const showDemoHint = demoEmail && demoPassword;

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
      <Card
        sx={{
          width: '100%',
          maxWidth: 400,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Stack spacing={3} alignItems="center">
            {/* Logo */}
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
                Sign in to Vectis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                ETL platform with visual flow designer
              </Typography>
            </Box>

            {/* Demo credentials */}
            {showDemoHint && (
              <Button
                variant="outlined"
                fullWidth
                onClick={fillDemo}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', py: 1, borderStyle: 'dashed' }}
              >
                Use Demo Account
              </Button>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                />
                {error && (
                  <Alert severity="error" variant="outlined" sx={{ fontSize: '0.8rem' }}>
                    {error}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || !email || !password}
                  sx={{ py: 1.2, fontWeight: 600 }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

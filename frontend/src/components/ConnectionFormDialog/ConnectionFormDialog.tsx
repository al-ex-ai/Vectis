import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Button,
  Divider,
} from '@mui/material';
import { CONNECTION_TYPES, SQL_TYPES } from '@utils/constants';

export interface ConnectionFormData {
  name: string;
  type: string;
  description: string;
  connection_string: string;
  crm_base_url: string;
  crm_api_version: string;
  crm_tenant_id: string;
  crm_client_id: string;
  crm_client_secret: string;
  sf_instance_url: string;
  sf_api_version: string;
  sf_client_id: string;
  sf_client_secret: string;
  sf_username: string;
  sf_password: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  form: ConnectionFormData;
  onChange: (key: keyof ConnectionFormData, value: string) => void;
  onSave: () => void;
  editing: boolean;
}

function ConnectionFormDialog({ open, onClose, form, onChange, onSave, editing }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Connection' : 'Add Connection'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Type"
            select
            value={form.type}
            onChange={(e) => onChange('type', e.target.value)}
            disabled={editing}
            required
            fullWidth
          >
            {CONNECTION_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>

          {SQL_TYPES.has(form.type) && (
            <TextField
              label="Connection String"
              value={form.connection_string}
              onChange={(e) => onChange('connection_string', e.target.value)}
              fullWidth
              placeholder="Server=...;Database=...;User Id=...;Password=..."
            />
          )}

          {form.type === 'dynamics_crm' && (
            <>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Base URL"
                  value={form.crm_base_url}
                  onChange={(e) => onChange('crm_base_url', e.target.value)}
                  fullWidth
                  placeholder="https://yourorg.api.crm.dynamics.com"
                />
                <TextField
                  label="API Version"
                  value={form.crm_api_version}
                  onChange={(e) => onChange('crm_api_version', e.target.value)}
                  sx={{ width: 140 }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Tenant ID"
                  value={form.crm_tenant_id}
                  onChange={(e) => onChange('crm_tenant_id', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Client ID"
                  value={form.crm_client_id}
                  onChange={(e) => onChange('crm_client_id', e.target.value)}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Client Secret"
                type="password"
                value={form.crm_client_secret}
                onChange={(e) => onChange('crm_client_secret', e.target.value)}
                fullWidth
                placeholder={editing ? 'Leave empty to keep current' : ''}
                helperText={editing ? 'Leave blank to keep existing secret' : ''}
              />
            </>
          )}

          {form.type === 'salesforce' && (
            <>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Instance URL"
                  value={form.sf_instance_url}
                  onChange={(e) => onChange('sf_instance_url', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="API Version"
                  value={form.sf_api_version}
                  onChange={(e) => onChange('sf_api_version', e.target.value)}
                  sx={{ width: 140 }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Client ID"
                  value={form.sf_client_id}
                  onChange={(e) => onChange('sf_client_id', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Client Secret"
                  type="password"
                  value={form.sf_client_secret}
                  onChange={(e) => onChange('sf_client_secret', e.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Username"
                  value={form.sf_username}
                  onChange={(e) => onChange('sf_username', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Password + Token"
                  type="password"
                  value={form.sf_password}
                  onChange={(e) => onChange('sf_password', e.target.value)}
                  fullWidth
                />
              </Stack>
            </>
          )}

          <Divider />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            fullWidth
            placeholder="Optional description"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave}>
          {editing ? 'Save Changes' : 'Add Connection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConnectionFormDialog;

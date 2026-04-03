import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Button,
} from '@mui/material';
import { typeLabel } from '@utils/constants';
import type { Connection } from '@typedefs/index';

export interface PipelineFormData {
  name: string;
  description: string;
  source_connection_id: string;
  dest_connection_id: string;
  dest_schema: string;
  status: string;
  tags: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  form: PipelineFormData;
  connections: Connection[];
  onChange: (form: PipelineFormData) => void;
  onSave: () => void;
  editing: boolean;
}

function PipelineFormDialog({ open, onClose, form, connections, onChange, onSave, editing }: Props) {
  const setField = (key: keyof PipelineFormData, value: string) =>
    onChange({ ...form, [key]: value });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Pipeline' : 'Create Pipeline'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Source Connection"
            select
            value={form.source_connection_id}
            onChange={(e) => setField('source_connection_id', e.target.value)}
            required
            fullWidth
          >
            {connections.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name} ({typeLabel(c.type)})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Destination Connection"
            select
            value={form.dest_connection_id}
            onChange={(e) => setField('dest_connection_id', e.target.value)}
            required
            fullWidth
          >
            {connections.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name} ({typeLabel(c.type)})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Destination Schema"
            value={form.dest_schema}
            onChange={(e) => setField('dest_schema', e.target.value)}
            fullWidth
            helperText="SQL schema for destination tables (default: dbo)"
          />
          <TextField
            label="Tags"
            value={form.tags}
            onChange={(e) => setField('tags', e.target.value)}
            fullWidth
            helperText="Comma-separated labels (e.g. extract, core, orders)"
          />
          {editing && (
            <TextField
              label="Status"
              select
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave}>
          {editing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PipelineFormDialog;

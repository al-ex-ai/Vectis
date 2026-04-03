import { Typography, Box, Paper, Button, IconButton, InputBase } from '@mui/material';
import { PlusIcon as AddIcon, CloseIcon } from '@components/icons';

export default function StaticValuesSection({
  staticValues, onChange,
}: {
  staticValues: Array<{ key: string; value: string }>;
  onChange: (values: Array<{ key: string; value: string }>) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: 'action.hover' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" fontWeight={700} color="info.main">
          Static Values — injected into every record
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...staticValues, { key: '', value: '' }])}>Add</Button>
      </Box>
      {staticValues.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
          No static values
        </Typography>
      ) : staticValues.map((sv, idx) => (
        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <InputBase
            placeholder="Column name"
            value={sv.key}
            onChange={(e) => onChange(staticValues.map((s, i) => i === idx ? { ...s, key: e.target.value } : s))}
            sx={{ flex: 1, fontSize: '0.75rem', px: 1, py: 0.25, bgcolor: 'background.paper', borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}
          />
          <Typography variant="caption" color="text.secondary">=</Typography>
          <InputBase
            placeholder="Value"
            value={sv.value}
            onChange={(e) => onChange(staticValues.map((s, i) => i === idx ? { ...s, value: e.target.value } : s))}
            sx={{ flex: 1, fontSize: '0.75rem', px: 1, py: 0.25, bgcolor: 'background.paper', borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}
          />
          <IconButton size="small" onClick={() => onChange(staticValues.filter((_, i) => i !== idx))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Paper>
  );
}

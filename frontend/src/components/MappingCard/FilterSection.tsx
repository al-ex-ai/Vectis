import {
  Typography, Box, Paper, Button, IconButton, InputBase,
  TextField, MenuItem, Select, FormControl, Autocomplete,
} from '@mui/material';
import {
  PlusIcon as AddIcon, CloseIcon, FilterIcon as FilterListIcon,
} from '@components/icons';
import type { ColumnMapping, FilterCondition } from './MappingCard';

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'ge', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'le', label: '<=' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_null', label: 'Not Null' },
  { value: 'is_null', label: 'Is Null' },
];

export default function FilterSection({
  filters, columns, onUpdate, onRemove, onAdd,
}: {
  filters: FilterCondition[];
  columns: ColumnMapping[];
  onUpdate: (idx: number, patch: Partial<FilterCondition>) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: 'action.hover' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" fontWeight={700} color="secondary">
          <FilterListIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
          Data Filters
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>Add</Button>
      </Box>
      {filters.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
          No filters — all records will be extracted
        </Typography>
      ) : filters.map((f, idx) => (
        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          {idx > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ width: 30, textAlign: 'center', flexShrink: 0 }}>AND</Typography>
          )}
          {idx === 0 && <Box sx={{ width: 30, flexShrink: 0 }} />}
          <Autocomplete
            size="small"
            sx={{ minWidth: 140, flex: 1 }}
            options={columns.length > 0 ? columns.map((c) => c.source) : f.field ? [f.field] : []}
            value={f.field || null}
            onChange={(_, val) => onUpdate(idx, { field: val || '' })}
            renderInput={(params) => (
              <TextField {...params} placeholder="Field..." sx={{ '& input': { fontSize: '0.75rem' } }} />
            )}
            slotProps={{ popper: { sx: { '& .MuiAutocomplete-option': { fontSize: '0.75rem' } } } }}
            freeSolo={columns.length === 0}
          />
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={f.operator}
              onChange={(e) => onUpdate(idx, { operator: e.target.value as string })}
              sx={{ fontSize: '0.75rem' }}
            >
              {OPERATORS.map((op) => (
                <MenuItem key={op.value} value={op.value} sx={{ fontSize: '0.75rem' }}>{op.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {f.operator !== 'is_null' && f.operator !== 'not_null' ? (
            <InputBase
              placeholder="Value..."
              value={f.value}
              onChange={(e) => onUpdate(idx, { value: e.target.value })}
              sx={{ flex: 1, fontSize: '0.75rem', px: 1, py: 0.25, bgcolor: 'background.paper', borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}
            />
          ) : (
            <Box sx={{ flex: 1 }} />
          )}
          <IconButton size="small" onClick={() => onRemove(idx)} title="Remove">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Paper>
  );
}

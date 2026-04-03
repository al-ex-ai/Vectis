import {
  Typography, Box, Checkbox, InputBase, Tooltip, CircularProgress, Chip, Stack,
} from '@mui/material';
import {
  ArrowRightIcon as ArrowForwardIcon,
  ChevronDownIcon as ExpandMoreIcon,
  ChevronUpIcon as ExpandLessIcon,
} from '@components/icons';
import { themedScrollbar } from '@utils/styles';
import type { EntityColumn } from '@typedefs/index';
import type { ColumnMapping } from './MappingCard';

export default function FieldMappingGrid({
  attrs, columns, fieldsExpanded, autoExpand,
  onToggleFields, onToggleField, onRenameDest, onSetColumns, onSetDirty,
}: {
  attrs: EntityColumn[] | null;
  columns: ColumnMapping[];
  fieldsExpanded: boolean;
  autoExpand: boolean;
  onToggleFields: () => void;
  onToggleField: (idx: number) => void;
  onRenameDest: (idx: number, val: string) => void;
  onSetColumns: (cols: ColumnMapping[]) => void;
  onSetDirty: () => void;
}) {
  const includedCount = columns.filter((c) => c.included).length;

  return (
    <>
      <Box
        onClick={onToggleFields}
        sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: 2, py: 1, cursor: 'pointer', borderTop: '1px solid', borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" fontWeight={700}>Field Mapping</Typography>
          {includedCount > 0 && (
            <Chip label={`${includedCount} fields`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {fieldsExpanded && columns.length > 0 && (
            <Chip label="Aa" size="small" variant="outlined" title="PascalCase" onClick={(e) => {
              e.stopPropagation();
              onSetColumns(columns.map((c) => ({
                ...c, dest: c.dest.replace(/(^|_)([a-z])/g, (_, _pre, ch: string) => ch.toUpperCase()),
              })));
              onSetDirty();
            }} />
          )}
          {fieldsExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Stack>
      </Box>

      {fieldsExpanded && (
        <>
          {!attrs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
          ) : attrs.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No attributes found</Typography>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 20px 1fr', alignItems: 'center', gap: 0.5, px: 2, py: 0.25, borderBottom: '2px solid', borderColor: 'divider', mb: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={includedCount === columns.length}
                  indeterminate={includedCount > 0 && includedCount < columns.length}
                  onChange={() => {
                    const allSelected = includedCount === columns.length;
                    onSetColumns(columns.map((c) => ({ ...c, included: !allSelected })));
                    onSetDirty();
                  }}
                  sx={{ p: 0.25 }}
                />
                <Typography variant="caption" fontWeight={700}>Source Field</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: 'center' }}>Type</Typography>
                <Box />
                <Typography variant="caption" fontWeight={700}>Dest Column</Typography>
              </Box>

              <Box sx={{ maxHeight: autoExpand ? undefined : 400, overflowY: autoExpand ? 'visible' : 'auto', overflowX: 'hidden', ...(autoExpand ? {} : themedScrollbar) }}>
                {columns.map((col, idx) => (
                  <Box
                    key={col.source}
                    sx={{
                      display: 'grid', gridTemplateColumns: '32px 1fr 80px 20px 1fr', alignItems: 'center', gap: 0.5,
                      px: 2, py: 0.25, borderBottom: '1px solid', borderColor: 'divider',
                      opacity: col.included ? 1 : 0.4,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={col.included}
                      onChange={() => onToggleField(idx)}
                      sx={{ p: 0.25 }}
                    />
                    <Tooltip title={col.source} placement="left">
                      <Typography variant="caption" noWrap>{col.source}</Typography>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }} noWrap>
                      {col.type}
                    </Typography>
                    <ArrowForwardIcon sx={{ fontSize: 14, color: col.included ? 'primary.main' : 'text.disabled' }} />
                    <InputBase
                      value={col.dest}
                      onChange={(e) => onRenameDest(idx, e.target.value)}
                      disabled={!col.included}
                      sx={{
                        fontSize: '0.75rem', px: 0.5, py: 0.25,
                        bgcolor: col.included ? 'action.hover' : 'transparent',
                        borderRadius: 0.5,
                        '& input': { p: 0, minWidth: 0 },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </>
      )}
    </>
  );
}

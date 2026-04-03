import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography, Box, Paper, Button, Stack, Chip, Collapse, Tooltip,
  MenuItem, CircularProgress, InputBase, Select, FormControl,
  IconButton,
} from '@mui/material';
import {
  ArrowRightIcon as ArrowForwardIcon,
  TrashIcon as DeleteIcon, ChevronDownIcon as ExpandMoreIcon,
  ChevronUpIcon as ExpandLessIcon, FilterIcon as FilterListIcon,
  SaveIcon, DatabaseIcon as StorageIcon,
  TableIcon as TableChartIcon,
} from '@components/icons';
import { api } from '@services/api';
import type { EntityMapping, EntityColumn } from '@typedefs/index';
import FilterSection from './FilterSection';
import StaticValuesSection from './StaticValuesSection';
import FieldMappingGrid from './FieldMappingGrid';

/* ── Types ── */
export interface ColumnMapping {
  source: string;
  dest: string;
  type: string;
  included: boolean;
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

/* ── Config shape ── */
interface MappingConfig {
  columns?: Record<string, string>;
  filters?: FilterCondition[];
  load_strategy?: string;
  entity_set_name?: string;
  primary_id?: string;
  lookup_fields?: string[];
  cdc_field?: string;
  static_values?: Record<string, string | number | boolean | null>;
  dest_schema?: string;
  is_intersect?: boolean;
  composite_keys?: string[];
  depends_on?: string[];
}

/* ── Mapping Card ── */
export default function MappingCard({
  mapping, pipelineId, onDelete, onUpdate, onToast, autoExpand = false, pipelineSchema = 'dbo', siblingMappings = [],
}: {
  mapping: EntityMapping;
  pipelineId: string;
  onDelete: (id: number) => void;
  onUpdate: () => void;
  onToast: (msg: string, sev: 'success' | 'error') => void;
  autoExpand?: boolean;
  pipelineSchema?: string;
  siblingMappings?: EntityMapping[];
}) {
  const existingConfig = useMemo<MappingConfig>(() => {
    try {
      const cfg = typeof mapping.mapping_config === 'string'
        ? JSON.parse(mapping.mapping_config || '{}')
        : (mapping.mapping_config || {});
      return cfg as MappingConfig;
    } catch { return {}; }
  }, [mapping.mapping_config]);

  const [expanded, setExpanded] = useState(autoExpand);
  const [attrs, setAttrs] = useState<EntityColumn[] | null>(null);
  const [columns, setColumns] = useState<ColumnMapping[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>(existingConfig.filters?.length ? existingConfig.filters : []);
  const [loadStrategy, setLoadStrategy] = useState<string>(existingConfig.load_strategy || 'append');
  const [destSchema, setDestSchema] = useState<string>(existingConfig.dest_schema || pipelineSchema);
  const [destTable, setDestTable] = useState<string>(mapping.dest_table);
  const [siblingDests, setSiblingDests] = useState<Array<{ id: number; dest_table: string; original: string }>>(
    siblingMappings.map((s) => ({ id: s.id, dest_table: s.dest_table, original: s.dest_table }))
  );
  const [staticValues, setStaticValues] = useState<Array<{ key: string; value: string }>>(
    Object.entries(existingConfig.static_values || {}).map(([k, v]) => ({ key: k, value: String(v ?? '') }))
  );
  const [fieldsExpanded, setFieldsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStatic, setShowStatic] = useState(staticValues.length > 0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFields = useCallback(async () => {
    if (attrs) return;
    try {
      const result = await api.get<{ attributes: EntityColumn[] }>(`/pipelines/${pipelineId}/discover/${mapping.source_entity}`);
      const fetchedAttrs = result.attributes || [];
      if (fetchedAttrs.length > 0) {
        setAttrs(fetchedAttrs);
        setColumns(fetchedAttrs.map((a) => ({
          source: a.name,
          dest: existingConfig.columns?.[a.name] ?? a.name,
          type: a.type,
          included: existingConfig.columns ? a.name in existingConfig.columns : true,
        })));
      } else if (existingConfig.columns && Object.keys(existingConfig.columns).length > 0) {
        // Discover returned empty — fall back to saved column mappings
        const fallbackAttrs = Object.keys(existingConfig.columns).map((name) => ({ name, type: 'string' }));
        setAttrs(fallbackAttrs);
        setColumns(fallbackAttrs.map((a) => ({
          source: a.name,
          dest: existingConfig.columns![a.name] ?? a.name,
          type: a.type,
          included: true,
        })));
      } else {
        setAttrs([]);
      }
    } catch {
      // Discover failed — fall back to saved column mappings from mapping_config
      if (existingConfig.columns && Object.keys(existingConfig.columns).length > 0) {
        const fallbackAttrs = Object.keys(existingConfig.columns).map((name) => ({ name, type: 'string' }));
        setAttrs(fallbackAttrs);
        setColumns(fallbackAttrs.map((a) => ({
          source: a.name,
          dest: existingConfig.columns![a.name] ?? a.name,
          type: a.type,
          included: true,
        })));
      } else {
        setAttrs([]);
      }
    }
  }, [attrs, pipelineId, mapping.source_entity, existingConfig.columns]);

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!attrs) {
      await loadFields();
      if (existingConfig.filters?.length) { setFilters(existingConfig.filters); setShowFilters(true); }
      if (existingConfig.load_strategy) setLoadStrategy(existingConfig.load_strategy);
    }
  };

  useEffect(() => { if (autoExpand) loadFields(); }, [autoExpand, loadFields]);

  const handleSave = async () => {
    setSaving(true);
    const colConfig = columns.length > 0
      ? Object.fromEntries(columns.filter((c) => c.included).map((c) => [c.source, c.dest]))
      : existingConfig.columns;
    const validFilters = filters.filter((f) => f.field && f.operator && (f.operator === 'is_null' || f.operator === 'not_null' || f.value));
    const svEntries = staticValues.filter(s => s.key);
    try {
      await api.put(`/mappings/${mapping.id}`, {
        dest_table: destTable,
        mapping_config: JSON.stringify({
          columns: colConfig,
          filters: validFilters,
          load_strategy: loadStrategy,
          ...(destSchema && destSchema !== pipelineSchema ? { dest_schema: destSchema } : {}),
          entity_set_name: existingConfig.entity_set_name,
          ...(existingConfig.primary_id ? { primary_id: existingConfig.primary_id } : {}),
          ...(existingConfig.lookup_fields ? { lookup_fields: existingConfig.lookup_fields } : {}),
          ...(existingConfig.cdc_field ? { cdc_field: existingConfig.cdc_field } : {}),
          ...(existingConfig.is_intersect ? { is_intersect: true } : {}),
          ...(existingConfig.composite_keys ? { composite_keys: existingConfig.composite_keys } : {}),
          ...(existingConfig.depends_on ? { depends_on: existingConfig.depends_on } : {}),
          ...(svEntries.length > 0 ? {
            static_values: Object.fromEntries(svEntries.map(s => {
              const num = Number(s.value);
              const val = s.value === 'true' ? true : s.value === 'false' ? false : s.value === 'null' ? null : !isNaN(num) && s.value !== '' ? num : s.value;
              return [s.key, val];
            }))
          } : {}),
        }),
        transform_type: 'column_map',
      });
      const changedSiblings = siblingDests.filter((s) => s.dest_table !== s.original);
      await Promise.all(changedSiblings.map((s) => api.put(`/mappings/${s.id}`, { dest_table: s.dest_table })));
      setSiblingDests((prev) => prev.map((s) => ({ ...s, original: s.dest_table })));
      setDirty(false);
      onUpdate();
      onToast('Field mappings saved', 'success');
    } catch (err) {
      onToast(`Error: ${err instanceof Error ? err.message : err}`, 'error');
    }
    setSaving(false);
  };

  const includedCount = columns.filter((c) => c.included).length;
  const activeFilterCount = filters.filter((f) => f.field && f.operator && (f.operator === 'is_null' || f.operator === 'not_null' || f.value)).length;

  const Wrapper: React.ElementType = autoExpand ? Box : Paper;
  const wrapperProps = autoExpand ? {} : { variant: 'outlined' as const, sx: { mb: 2 } };

  return (
    <Wrapper {...wrapperProps}>
      {/* Header row — hidden in drawer mode */}
      {!autoExpand && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={handleExpand}>
          {/* Source */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
            <StorageIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
            <Tooltip title={mapping.source_entity} placement="top">
              <Typography variant="body2" fontWeight={600} noWrap>{mapping.source_entity.replace(/^\w+\./, '')}</Typography>
            </Tooltip>
          </Box>
          {/* Arrow + strategy */}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Chip label={loadStrategy} size="small" color={loadStrategy === 'replace' ? 'error' : loadStrategy === 'upsert' ? 'info' : 'default'} variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
            <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Stack>
          {/* Destination */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
            <TableChartIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
            <Tooltip title={mapping.dest_table} placement="top">
              <Typography variant="body2" fontWeight={600} noWrap>{mapping.dest_table.replace(/^\w+\./, '')}</Typography>
            </Tooltip>
          </Box>
          {/* Meta chips + actions */}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
            {includedCount > 0 && <Chip label={`${includedCount}`} size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', minWidth: 28 }} />}
            {activeFilterCount > 0 && <Chip icon={<FilterListIcon sx={{ fontSize: '12px !important' }} />} label={`${activeFilterCount}`} size="small" color="secondary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(mapping.id); }} title="Delete mapping">
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
          </Stack>
        </Box>
      )}

      <Collapse in={expanded || autoExpand}>
        <Box sx={{ px: autoExpand ? 0 : 1.5, pb: 1.5 }}>
          {/* Save bar */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button size="small" variant="contained" startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />} onClick={handleSave} disabled={!dirty || saving}>
              {dirty ? 'Save Changes' : 'Saved'}
            </Button>
          </Box>

          {/* Settings */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.08em', fontWeight: 700, mb: 1.5, display: 'block' }}>
              Transfer Settings
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Destination Table</Typography>
                <InputBase value={destTable} onChange={(e) => { setDestTable(e.target.value); setDirty(true); }}
                  sx={{ fontSize: '0.8rem', px: 1, py: 0.5, width: '100%', bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
              </Box>
              {siblingDests.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Related Destinations ({siblingDests.length} split{siblingDests.length > 1 ? 's' : ''} from same source)
                  </Typography>
                  <Stack spacing={0.5}>
                    {siblingDests.map((s, idx) => (
                      <InputBase key={s.id} value={s.dest_table}
                        onChange={(e) => { setSiblingDests((prev) => prev.map((p, i) => i === idx ? { ...p, dest_table: e.target.value } : p)); setDirty(true); }}
                        sx={{ fontSize: '0.8rem', px: 1, py: 0.5, width: '100%', bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: s.dest_table !== s.original ? 'primary.main' : 'divider' }} />
                    ))}
                  </Stack>
                </Box>
              )}
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Load Strategy</Typography>
                  <FormControl size="small" fullWidth>
                    <Select value={loadStrategy} onChange={(e) => { setLoadStrategy(e.target.value as string); setDirty(true); }} sx={{ fontSize: '0.8rem' }}>
                      <MenuItem value="append">Append — add new records</MenuItem>
                      <MenuItem value="replace">Replace — clear &amp; reload all</MenuItem>
                      <MenuItem value="upsert">Upsert — insert or update by key</MenuItem>
                      <MenuItem value="cdc">CDC — incremental sync</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ width: 120 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Dest Schema</Typography>
                  <InputBase placeholder="dbo" value={destSchema} onChange={(e) => { setDestSchema(e.target.value); setDirty(true); }}
                    sx={{ fontSize: '0.8rem', px: 1, py: 0.5, width: '100%', bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Chip icon={<FilterListIcon sx={{ fontSize: 16 }} />}
                  label={activeFilterCount > 0 ? `${activeFilterCount} Filter${activeFilterCount > 1 ? 's' : ''}` : 'Add Filters'}
                  size="small" variant={showFilters ? 'filled' : 'outlined'} color={activeFilterCount > 0 ? 'secondary' : 'default'}
                  onClick={() => { setShowFilters((v) => !v); if (!attrs) loadFields(); }} sx={{ fontWeight: 500 }} />
                <Chip label={staticValues.filter(s => s.key).length > 0 ? `${staticValues.filter(s => s.key).length} Static Value${staticValues.filter(s => s.key).length > 1 ? 's' : ''}` : 'Static Values'}
                  size="small" variant={showStatic ? 'filled' : 'outlined'} color={staticValues.filter(s => s.key).length > 0 ? 'info' : 'default'}
                  onClick={() => setShowStatic((v) => !v)} sx={{ fontWeight: 500 }} />
              </Stack>
            </Stack>
          </Box>

          <Collapse in={showFilters}>
            <FilterSection filters={filters} columns={columns}
              onUpdate={(idx, patch) => { setFilters((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f)); setDirty(true); }}
              onRemove={(idx) => { setFilters((prev) => prev.filter((_, i) => i !== idx)); setDirty(true); }}
              onAdd={() => { setFilters((prev) => [...prev, { field: '', operator: 'eq', value: '' }]); setShowFilters(true); setDirty(true); if (!attrs) loadFields(); }} />
          </Collapse>

          <Collapse in={showStatic}>
            <StaticValuesSection staticValues={staticValues} onChange={(v) => { setStaticValues(v); setDirty(true); }} />
          </Collapse>

          <FieldMappingGrid attrs={attrs} columns={columns} fieldsExpanded={fieldsExpanded} autoExpand={autoExpand}
            onToggleFields={() => { if (!fieldsExpanded) loadFields(); setFieldsExpanded((v) => !v); }}
            onToggleField={(idx) => { setColumns((prev) => prev.map((c, i) => i === idx ? { ...c, included: !c.included } : c)); setDirty(true); }}
            onRenameDest={(idx, val) => { setColumns((prev) => prev.map((c, i) => i === idx ? { ...c, dest: val } : c)); setDirty(true); }}
            onSetColumns={setColumns} onSetDirty={() => setDirty(true)} />
        </Box>
      </Collapse>
    </Wrapper>
  );
}

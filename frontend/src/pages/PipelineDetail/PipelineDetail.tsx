import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Button, Stack, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, LinearProgress,
  MenuItem, CircularProgress, Drawer,
} from '@mui/material';
import {
  PlusIcon as AddIcon, ArrowRightIcon as ArrowForwardIcon, CheckCircleIcon,
  CloseIcon, PlayIcon as PlayArrowIcon, SearchIcon,
  ShieldCheckIcon as VerifiedIcon,
  WarningIcon as WarningAmberIcon, ErrorCircleIcon as ErrorIcon, GearIcon as SettingsIcon,
} from '@components/icons';
import { api } from '@services/api';
import { alpha } from '@mui/material';
import Toast from '@components/Toast';
import SchemaCanvas from '@components/SchemaCanvas';
import DataPreviewDialog from '@components/DataPreviewDialog';
import MappingCard from '@components/MappingCard';
import PipelineSettingsDrawer from '@components/PipelineSettingsDrawer';
import type { PipelineSettings } from '@components/PipelineSettingsDrawer';
import type { Pipeline, EntityMapping, CrmEntity, EntityColumn, EntityRelation } from '@typedefs/index';
import { themedScrollbar } from '@utils/styles';
import SchemaPanel from './SchemaPanel';

export default function PipelineDetail() {
  const { id, projectId } = useParams<{ id: string; projectId: string }>();
  const navigate = useNavigate();
  const basePath = projectId ? `/projects/${projectId}` : '';
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [mappings, setMappings] = useState<EntityMapping[]>([]);
  const [entities, setEntities] = useState<CrmEntity[]>([]);
  const [_sourceType, setSourceType] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [mappingDialog, setMappingDialog] = useState(false);
  const [mappingForm, setMappingForm] = useState({ source_entity: '', dest_table: '', mapping_config: '{}', transform_type: 'direct' });
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [entityAttrs, setEntityAttrs] = useState<Record<string, { attributes: EntityColumn[]; relations: EntityRelation[] }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });
  const [selectedMapping, setSelectedMapping] = useState<EntityMapping | null>(null);
  const [mappingRelations, setMappingRelations] = useState<Record<string, EntityRelation[]>>({});
  const [schemaTab, setSchemaTab] = useState(0);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [destEntities, setDestEntities] = useState<CrmEntity[]>([]);
  const [destDiscovering, setDestDiscovering] = useState(false);
  const [previewTable, setPreviewTable] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<PipelineSettings>({
    batch_size: 1000,
    retry_count: 0,
    timeout_seconds: 300,
    track_fks: true,
    enforce_fks: true,
    fk_mode: 'all',
    notifications_on_failure: '',
    notifications_on_completion: '',
  });

  const load = useCallback(() => {
    api.get<{ pipeline: Pipeline; mappings: EntityMapping[] }>(`/pipelines/${id}`).then((d) => {
      setPipeline(d.pipeline);
      setMappings(d.mappings);
      setSelectedMapping(prev => {
        if (!prev) return null;
        return d.mappings.find(m => m.id === prev.id) ?? null;
      });
      if (d.pipeline.settings) {
        try {
          const s = typeof d.pipeline.settings === 'string' ? JSON.parse(d.pipeline.settings) : d.pipeline.settings;
          setSettings(prev => ({ ...prev, ...s }));
        } catch { /* ignore */ }
      }
    }).catch(console.error);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Build fallback entities from existing mappings when discover returns empty
  const buildFallbackEntities = useCallback((side: 'source' | 'dest'): CrmEntity[] => {
    return mappings.map((m) => {
      let cfg: { columns?: Record<string, string> } = {};
      try { cfg = typeof m.mapping_config === 'string' ? JSON.parse(m.mapping_config || '{}') : (m.mapping_config || {}); } catch { /* ignore */ }
      const cols = cfg.columns || {};
      if (side === 'source') {
        const name = m.source_entity.replace(/ JOIN .*/i, '');
        return {
          name, display_name: name.replace(/^\w+\./, ''),
          columns: Object.keys(cols).map((c) => ({ name: c, type: 'string' })),
        } as CrmEntity;
      }
      return {
        name: m.dest_table, display_name: m.dest_table.replace(/^\w+\./, ''),
        columns: Object.values(cols).map((c) => ({ name: c, type: 'string' })),
      } as CrmEntity;
    });
  }, [mappings]);

  // Auto-populate schema panels from mappings on load
  useEffect(() => {
    if (mappings.length === 0) return;
    if (entities.length === 0) {
      setEntities(buildFallbackEntities('source'));
    }
    if (destEntities.length === 0) {
      setDestEntities(buildFallbackEntities('dest'));
    }
  }, [mappings, buildFallbackEntities]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mappings.forEach((m) => {
      if (!mappingRelations[m.source_entity]) {
        api.get<{ attributes: EntityColumn[]; relations: EntityRelation[] }>(`/pipelines/${id}/discover/${m.source_entity}`)
          .then((r) => {
            setMappingRelations((prev) => ({ ...prev, [m.source_entity]: r.relations ?? [] }));
          })
          .catch(() => {});
      }
    });
  }, [mappings, id, mappingRelations]);

  const handleDiscover = async () => {
    if (schemaTab === 0) {
      setDiscovering(true);
      try {
        const result = await api.get<{ entities: CrmEntity[]; source_type: string }>(`/pipelines/${id}/discover?side=source`);
        const ents = result.entities ?? [];
        setEntities(ents.length > 0 ? ents : buildFallbackEntities('source'));
        setSourceType(result.source_type ?? pipeline?.source_type ?? '');
      } catch {
        setEntities(buildFallbackEntities('source'));
        setSourceType(pipeline?.source_type ?? '');
      }
      setDiscovering(false);
    } else {
      setDestDiscovering(true);
      try {
        const result = await api.get<{ entities: CrmEntity[]; source_type: string }>(`/pipelines/${id}/discover?side=dest`);
        const ents = result.entities ?? [];
        setDestEntities(ents.length > 0 ? ents : buildFallbackEntities('dest'));
      } catch {
        setDestEntities(buildFallbackEntities('dest'));
      }
      setDestDiscovering(false);
    }
  };

  const handleExpandEntity = async (name: string) => {
    if (expandedEntity === name) { setExpandedEntity(null); return; }
    setExpandedEntity(name);
    if (!entityAttrs[name]) {
      try {
        const result = await api.get<{ attributes: EntityColumn[]; relations: EntityRelation[] }>(`/pipelines/${id}/discover/${name}`);
        setEntityAttrs((prev) => ({ ...prev, [name]: result }));
      } catch { /* ignore */ }
    }
  };

  const handleAddMapping = async () => {
    try {
      await api.post(`/pipelines/${id}/mappings`, { ...mappingForm, pipeline_id: id });
      setMappingDialog(false);
      setMappingForm({ source_entity: '', dest_table: '', mapping_config: '{}', transform_type: 'direct' });
      load();
    } catch (err) {
      setToast({ open: true, message: `Error: ${err instanceof Error ? err.message : err}`, severity: 'error' });
    }
  };

  const handleDeleteMapping = useCallback(async (mid: number) => {
    if (!confirm('Delete this mapping?')) return;
    await api.del(`/mappings/${mid}`);
    load();
  }, [load]);

  const [runStarting, setRunStarting] = useState(false);

  const handleRun = async () => {
    setRunStarting(true);
    try {
      const result = await api.post<{ success: boolean; run_id: number; error?: string }>(`/pipelines/${id}/run`, { batch_size: 1000 });
      if (result.error) {
        setToast({ open: true, message: result.error, severity: 'error' });
        setRunStarting(false);
      } else if (result.success) {
        navigate(`${basePath}/runs/${result.run_id}`);
      }
    } catch (err) {
      setToast({ open: true, message: `Error: ${err instanceof Error ? err.message : err}`, severity: 'error' });
      setRunStarting(false);
    }
  };

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [validationDialog, setValidationDialog] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await api.post<Record<string, unknown>>(`/pipelines/${id}/validate`);
      setValidationResult(result);
      setValidationDialog(true);
    } catch (err) {
      setToast({ open: true, message: `Validation error: ${err instanceof Error ? err.message : err}`, severity: 'error' });
    }
    setValidating(false);
  };

  const mappedEntities = new Set(mappings.map((m) => m.source_entity));

  const handleQuickAdd = (entity: CrmEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    const schema = pipeline?.dest_schema ?? 'dbo';
    const destTable = `${schema}.${entity.display_name.replace(/[^a-zA-Z0-9]/g, '')}`;
    const configObj: Record<string, unknown> = {};
    if (entity.entity_set_name) configObj.entity_set_name = entity.entity_set_name;
    if (entity.is_intersect) {
      configObj.is_intersect = true;
      configObj.load_strategy = 'replace';
    }
    setMappingForm({ source_entity: entity.name, dest_table: destTable, mapping_config: JSON.stringify(configObj), transform_type: 'direct' });
    setMappingDialog(true);
  };

  const showToast = (msg: string, sev: 'success' | 'error') => {
    setToast({ open: true, message: msg, severity: sev });
  };

  if (!pipeline) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 2, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{pipeline.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{pipeline.description || 'No description'}</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleDiscover} disabled={discovering || destDiscovering}>
            {(discovering || destDiscovering) ? 'Discovering...' : `Discover ${schemaTab === 0 ? 'Source' : 'Destination'}`}
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setMappingDialog(true)}>Add Mapping</Button>
          <Button variant="outlined" color="info" startIcon={validating ? <CircularProgress size={16} color="inherit" /> : <VerifiedIcon />} onClick={handleValidate} disabled={mappings.length === 0 || validating}>
            {validating ? 'Validating...' : 'Validate'}
          </Button>
          <IconButton onClick={() => setSettingsOpen(true)} aria-label="Pipeline settings" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
          <Button variant="contained" startIcon={runStarting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />} onClick={handleRun} disabled={mappings.length === 0 || runStarting}>
            {runStarting ? 'Starting...' : 'Run Pipeline'}
          </Button>
        </Stack>
      </Box>

      {(discovering || destDiscovering) && <LinearProgress sx={{ mb: 2, flexShrink: 0 }} />}

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, gap: 2 }}>
        <SchemaPanel
          open={schemaOpen} schemaTab={schemaTab} onSchemaTabChange={setSchemaTab}
          entities={entities} destEntities={destEntities}
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          mappedEntities={mappedEntities} entityAttrs={entityAttrs}
          expandedEntity={expandedEntity} onExpandEntity={handleExpandEntity}
          onQuickAdd={handleQuickAdd} onPreview={setPreviewTable}
        />

        {/* Schema Canvas */}
        <Paper sx={{ flex: 1, position: 'relative', minWidth: 0, border: '1px solid', borderColor: 'divider', bgcolor: 'transparent' }}>
          {mappings.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
              <Box sx={{ textAlign: 'center' }}>
                <ArrowForwardIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                <Typography variant="body2">No mappings yet. Use the + button on source entities or click Add Mapping.</Typography>
              </Box>
            </Box>
          ) : (
            <SchemaCanvas
              mappings={mappings}
              relations={mappingRelations}
              onSelectMapping={setSelectedMapping}
              onDeleteMapping={handleDeleteMapping}
              panelOpen={schemaOpen}
              onTogglePanel={() => setSchemaOpen(v => !v)}
            />
          )}
        </Paper>
      </Box>

      {/* Mapping Detail Drawer */}
      <Drawer anchor="right" open={!!selectedMapping} onClose={() => setSelectedMapping(null)} PaperProps={{ sx: { width: { xs: '100%', md: 720 }, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}>
        {selectedMapping && (
          <>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04)}, ${alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.08 : 0.04)})` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                  <Typography variant="h6" fontWeight={700}>{selectedMapping.source_entity}</Typography>
                  <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
                  <Typography variant="h6" fontWeight={700}>{selectedMapping.dest_table.includes('.') ? selectedMapping.dest_table.split('.').pop() : selectedMapping.dest_table}</Typography>
                </Stack>
                <IconButton onClick={() => setSelectedMapping(null)} size="small" aria-label="Close mapping drawer"><CloseIcon /></IconButton>
              </Stack>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2, ...themedScrollbar }}>
              <MappingCard
                mapping={selectedMapping}
                pipelineId={id!}
                pipelineSchema={pipeline?.dest_schema ?? 'dbo'}
                onDelete={(mid) => { handleDeleteMapping(mid); setSelectedMapping(null); }}
                onUpdate={() => { load(); }}
                onToast={showToast}
                autoExpand
                siblingMappings={mappings.filter((m) => m.source_entity === selectedMapping.source_entity && m.id !== selectedMapping.id)}
              />
            </Box>
          </>
        )}
      </Drawer>

      {/* Add Mapping Dialog */}
      <Dialog open={mappingDialog} onClose={() => setMappingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Entity Mapping</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {entities.length > 0 ? (
              <TextField label="Source Entity" select value={mappingForm.source_entity} onChange={(e) => setMappingForm({ ...mappingForm, source_entity: e.target.value })} required fullWidth>
                {entities.map((ent) => <MenuItem key={ent.name} value={ent.name}>{ent.display_name} ({ent.name})</MenuItem>)}
              </TextField>
            ) : (
              <TextField label="Source Entity" value={mappingForm.source_entity} onChange={(e) => setMappingForm({ ...mappingForm, source_entity: e.target.value })} required fullWidth />
            )}
            <TextField label="Destination Table" value={mappingForm.dest_table} onChange={(e) => setMappingForm({ ...mappingForm, dest_table: e.target.value })} required fullWidth />
            <TextField label="Transform Type" select value={mappingForm.transform_type} onChange={(e) => setMappingForm({ ...mappingForm, transform_type: e.target.value })} fullWidth>
              <MenuItem value="direct">Direct (1:1)</MenuItem>
              <MenuItem value="column_map">Column Map</MenuItem>
              <MenuItem value="split">Split</MenuItem>
              <MenuItem value="merge">Merge</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMapping}>Add Mapping</Button>
        </DialogActions>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={validationDialog} onClose={() => setValidationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Pipeline Validation
          {validationResult && (
            <Chip
              label={(validationResult as { valid?: boolean }).valid ? 'PASSED' : 'FAILED'}
              color={(validationResult as { valid?: boolean }).valid ? 'success' : 'error'}
              size="small"
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {validationResult && (() => {
            const r = validationResult as { pipeline?: string; source_connection?: { status: string; message: string }; dest_connection?: { status: string; message: string }; mappings?: Array<{ source_entity: string; dest_table: string; load_strategy: string; status: string; checks: Array<{ check: string; status: string; message: string }> }>; summary?: { pass: number; warn: number; fail: number } };
            const sIcon = (s: string) => s === 'pass' ? <CheckCircleIcon fontSize="small" color="success" /> : s === 'warn' ? <WarningAmberIcon fontSize="small" color="warning" /> : <ErrorIcon fontSize="small" color="error" />;
            return (
              <Stack spacing={2}>
                {r.source_connection && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{sIcon(r.source_connection.status)}<Typography variant="body2"><strong>Source:</strong> {r.source_connection.message}</Typography></Box>}
                {r.dest_connection && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{sIcon(r.dest_connection.status)}<Typography variant="body2"><strong>Dest:</strong> {r.dest_connection.message}</Typography></Box>}
                {(r.mappings ?? []).map((m, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2">{m.source_entity} &rarr; {m.dest_table}</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip label={m.load_strategy} size="small" variant="outlined" />
                        <Chip label={m.status.toUpperCase()} size="small" color={m.status === 'pass' ? 'success' : m.status === 'warn' ? 'warning' : 'error'} />
                      </Stack>
                    </Box>
                    {m.checks.map((c, j) => (
                      <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
                        {sIcon(c.status)}
                        <Typography variant="caption" color={c.status === 'fail' ? 'error' : 'text.secondary'}>{c.message}</Typography>
                      </Box>
                    ))}
                  </Paper>
                ))}
                {r.summary && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                    {r.summary.pass} passed, {r.summary.warn} warnings, {r.summary.fail} failed
                  </Typography>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions><Button onClick={() => setValidationDialog(false)}>Close</Button></DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      {pipeline && (
        <DataPreviewDialog open={previewTable !== ''} onClose={() => setPreviewTable('')} connectionId={pipeline.dest_connection_id} tableName={previewTable} />
      )}

      <PipelineSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        onSave={() => {
          api.put(`/pipelines/${id}/settings`, settings).then(() => {
            setSettingsOpen(false);
            showToast('Settings saved', 'success');
            load();
          }).catch(err => showToast(`Error: ${err instanceof Error ? err.message : err}`, 'error'));
        }}
      />
    </Box>
  );
}

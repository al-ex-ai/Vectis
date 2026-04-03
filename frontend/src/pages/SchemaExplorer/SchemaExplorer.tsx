import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Box, CircularProgress, IconButton, Tooltip,
  ToggleButton, ToggleButtonGroup, Divider, Select, MenuItem,
  useTheme,
  type SelectChangeEvent,
} from '@mui/material';
import {
  BackIcon as ArrowBackIcon, DatabaseIcon as StorageIcon,
  ZoomInIcon, ZoomOutIcon, FitViewIcon as FitScreenIcon,
  MinimapIcon as MapIcon, TreeIcon as AccountTreeIcon,
} from '@components/icons';
import {
  ReactFlow, Background, MiniMap,
  type Node, type Edge, type ReactFlowInstance,
  useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@services/api';
import { getSchemaColor, getCanvasColors } from '@theme/constants';
import { useThemeMode } from '@theme/useThemeMode';
import TableNode from '@components/SchemaTableNode';
import type { SchemaData, TableNodeData, Table, Column, Relationship } from '@components/SchemaTableNode';
import { buildLayout, type EdgeFilters } from '@components/SchemaTableNode/schemaLayout';

const nodeTypes = { tableNode: TableNode };

export default function SchemaExplorer() {
  const { connId, projectId } = useParams<{ connId: string; projectId: string }>();
  const [resolvedConnId, setResolvedConnId] = useState<string | undefined>(connId);
  const [availableConns, setAvailableConns] = useState<Array<{ id: number; name: string; type: string }>>([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode: themeMode } = useThemeMode();
  const isDark = theme.palette.mode === 'dark';
  const canvas = getCanvasColors(themeMode);
  const [data, setData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSchema, setActiveSchema] = useState<string>('all');
  const [edgeFilters, setEdgeFilters] = useState<EdgeFilters>({ showSameSchema: true, showCrossSchema: true, showLookup: false });
  const [showMinimap, setShowMinimap] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfRef = useRef<ReactFlowInstance | null>(null);

  const toolbarBtnSx = {
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    color: 'text.secondary',
    width: 32, height: 32,
    '&:hover': { bgcolor: 'action.selected', color: 'text.primary' },
  };

  const toolbarActiveSx = {
    ...toolbarBtnSx,
    bgcolor: 'action.selected',
    color: 'text.primary',
    borderColor: 'primary.main',
  };

  useEffect(() => {
    if (connId) {
      setResolvedConnId(connId);
    } else if (projectId) {
      api.get<Array<{ source_connection_id: number; dest_connection_id: number; source_name?: string; dest_name?: string; source_type?: string; dest_type?: string }>>(`/pipelines?project_id=${projectId}`).then(pipes => {
        if (pipes.length > 0) {
          const connMap = new Map<number, { id: number; name: string; type: string }>();
          pipes.forEach(p => {
            if (p.source_type?.includes('sql')) connMap.set(p.source_connection_id, { id: p.source_connection_id, name: p.source_name || `Connection ${p.source_connection_id}`, type: p.source_type || '' });
            if (p.dest_type?.includes('sql')) connMap.set(p.dest_connection_id, { id: p.dest_connection_id, name: p.dest_name || `Connection ${p.dest_connection_id}`, type: p.dest_type || '' });
          });
          const conns = Array.from(connMap.values());
          setAvailableConns(conns);

          const counts: Record<number, number> = {};
          pipes.forEach(p => { counts[p.dest_connection_id] = (counts[p.dest_connection_id] || 0) + 1; });
          const bestConn = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          if (bestConn) setResolvedConnId(bestConn[0]);
        }
      }).catch(() => {});
    }
  }, [connId, projectId]);

  // Build fallback SchemaData from pipeline mappings when live connection fails
  const buildFallbackSchema = useCallback(async (): Promise<SchemaData | null> => {
    if (!resolvedConnId) return null;
    try {
      const pipes = await api.get<Array<{ id: number; source_connection_id: number; dest_connection_id: number }>>(`/pipelines?project_id=${projectId ?? ''}`);
      const relevantPipes = pipes.filter(p => String(p.source_connection_id) === resolvedConnId || String(p.dest_connection_id) === resolvedConnId);
      if (relevantPipes.length === 0) return null;

      const schemas: Record<string, Table[]> = {};
      const relationships: Relationship[] = [];
      const isSource = String(relevantPipes[0].source_connection_id) === resolvedConnId;

      for (const pipe of relevantPipes) {
        const detail = await api.get<{ mappings: Array<{ source_entity: string; dest_table: string; mapping_config: string }> }>(`/pipelines/${pipe.id}`);
        for (const m of detail.mappings) {
          let cfg: { columns?: Record<string, string>; primary_key?: string | string[] } = {};
          try { cfg = typeof m.mapping_config === 'string' ? JSON.parse(m.mapping_config || '{}') : (m.mapping_config || {}); } catch { /* ignore */ }
          const cols = cfg.columns || {};
          const rawName = isSource ? m.source_entity.replace(/ JOIN .*/i, '') : m.dest_table;
          const parts = rawName.split('.');
          const schemaName = parts.length > 1 ? parts[0] : 'public';
          const tableName = parts.length > 1 ? parts[1] : parts[0];
          const pk = cfg.primary_key;
          const pkArr = Array.isArray(pk) ? pk : (pk ? [pk] : []);

          if (!schemas[schemaName]) schemas[schemaName] = [];
          if (!schemas[schemaName].find(t => t.name === tableName)) {
            const columns: Column[] = isSource
              ? Object.keys(cols).map(c => ({ name: c, type: 'string', nullable: true }))
              : Object.values(cols).map(c => ({ name: c, type: 'string', nullable: true }));
            schemas[schemaName].push({ name: tableName, schema: schemaName, columns, primary_keys: pkArr, row_count: 0 });
          }
        }
      }

      const tableCount = Object.values(schemas).reduce((sum, tables) => sum + tables.length, 0);
      return {
        success: true, database: isSource ? 'Source' : 'Destination',
        schemas, relationships, table_count: tableCount, schema_count: Object.keys(schemas).length,
      };
    } catch { return null; }
  }, [resolvedConnId, projectId]);

  useEffect(() => {
    if (!resolvedConnId) return;
    api.get<SchemaData>(`/connections/${resolvedConnId}/schema`)
      .then(result => {
        if (result?.success) {
          setData(result);
          setLoading(false);
        } else {
          buildFallbackSchema().then(fb => { if (fb) setData(fb); setLoading(false); });
        }
      })
      .catch(() => {
        buildFallbackSchema().then(fb => { if (fb) setData(fb); setLoading(false); });
      });
  }, [resolvedConnId, buildFallbackSchema]);

  useEffect(() => {
    if (!data?.success) return;
    const schema = activeSchema === 'all' ? null : activeSchema;
    const result = buildLayout(data, schema, isDark, edgeFilters);
    setNodes(result.nodes);
    setEdges(result.edges);
    setTimeout(() => rfRef.current?.fitView({ padding: 0.15 }), 50);
  }, [data, activeSchema, edgeFilters, isDark, setNodes, setEdges]);

  const handleZoomIn = useCallback(() => rfRef.current?.zoomIn({ duration: 200 }), []);
  const handleZoomOut = useCallback(() => rfRef.current?.zoomOut({ duration: 200 }), []);
  const handleFitView = useCallback(() => rfRef.current?.fitView({ padding: 0.15, duration: 300 }), []);

  const handleSchemaChange = (e: SelectChangeEvent) => setActiveSchema(e.target.value);

  const handleFkToggle = (_: React.MouseEvent<HTMLElement>, vals: string[]) => {
    setEdgeFilters({
      showSameSchema: vals.includes('within'),
      showCrossSchema: vals.includes('cross'),
      showLookup: vals.includes('lookup'),
    });
  };

  const activeFkVals: string[] = [];
  if (edgeFilters.showSameSchema) activeFkVals.push('within');
  if (edgeFilters.showCrossSchema) activeFkVals.push('cross');
  if (edgeFilters.showLookup) activeFkVals.push('lookup');

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  }

  if (!data?.success) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled' }}>
        <StorageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
        <Typography variant="h6" color="text.secondary">No schema loaded</Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>Connect to a SQL database to explore its schema</Typography>
      </Box>
    );
  }

  const schemaNames = Object.keys(data.schemas).sort();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5 }, flexWrap: 'wrap',
        px: { xs: 1, sm: 2 }, py: 1, flexShrink: 0,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <IconButton onClick={() => navigate(projectId ? `/projects/${projectId}` : '/connections')} size="small" sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        {availableConns.length > 1 ? (
          <Select
            value={resolvedConnId || ''}
            onChange={(e) => { setResolvedConnId(e.target.value as string); setLoading(true); }}
            size="small"
            sx={{
              minWidth: { xs: 100, sm: 160 }, fontSize: 13, fontWeight: 700, height: 32,
              bgcolor: 'action.hover',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              '& .MuiSelect-select': { py: 0.5, display: 'flex', alignItems: 'center', gap: 1 },
            }}
          >
            {availableConns.map(c => (
              <MenuItem key={c.id} value={String(c.id)} sx={{ fontSize: 13 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  {c.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        ) : (
          <>
            <StorageIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary', mr: 1 }}>{data.database}</Typography>
          </>
        )}
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
          {data.table_count} tables &middot; {data.relationships.length} FKs
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'divider' }} />

        <Select
          data-tour="schema-filter"
          value={activeSchema}
          onChange={handleSchemaChange}
          size="small"
          sx={{
            minWidth: { xs: 90, sm: 130 }, fontSize: 12, height: 32,
            bgcolor: 'action.hover',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
            '& .MuiSelect-select': { py: 0.5 },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: 12 }}>All schemas</MenuItem>
          {schemaNames.map(s => {
            const c = getSchemaColor(s, isDark);
            return (
              <MenuItem key={s} value={s} sx={{ fontSize: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.border }} />
                  {s} ({data.schemas[s].length})
                </Box>
              </MenuItem>
            );
          })}
        </Select>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'divider' }} />

        <Box data-tour="schema-fk" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <AccountTreeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        <ToggleButtonGroup
          value={activeFkVals}
          onChange={handleFkToggle}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              fontSize: 11, px: 1.5, py: 0.25, height: 28,
              color: 'text.disabled', borderColor: 'divider',
              textTransform: 'none',
              '&.Mui-selected': { bgcolor: 'action.selected', color: 'text.primary' },
            },
          }}
        >
          <ToggleButton value="within">Within</ToggleButton>
          <ToggleButton value="cross">Cross</ToggleButton>
          <ToggleButton value="lookup">Lookup</ToggleButton>
        </ToggleButtonGroup>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Zoom In"><IconButton size="small" onClick={handleZoomIn} sx={toolbarBtnSx} data-tour="schema-zoom"><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Zoom Out"><IconButton size="small" onClick={handleZoomOut} sx={toolbarBtnSx}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Fit View"><IconButton size="small" onClick={handleFitView} sx={toolbarBtnSx}><FitScreenIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Minimap"><IconButton size="small" onClick={() => setShowMinimap(v => !v)} sx={showMinimap ? toolbarActiveSx : toolbarBtnSx}><MapIcon fontSize="small" /></IconButton></Tooltip>
      </Box>


      {/* ER Diagram */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => { rfRef.current = instance; }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
          style={{ background: canvas.background }}
        >
          <Background color={canvas.grid} gap={canvas.dotGap} />
          {showMinimap && (
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'group') return 'transparent';
                const schema = (n.data as TableNodeData)?.schema;
                return schema ? getSchemaColor(schema, isDark).border : (isDark ? '#555' : '#ccc');
              }}
              maskColor={canvas.minimapMask}
              style={{ backgroundColor: canvas.minimapBg }}
            />
          )}
        </ReactFlow>
      </Box>
    </Box>
  );
}

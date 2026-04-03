import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, Background, BackgroundVariant, useNodesState, useEdgesState, useReactFlow,
  Position, Handle,
  type Node, type NodeTypes, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, Chip, Stack, IconButton, Tooltip } from '@mui/material';
import {
  TrashIcon, FitViewIcon, ZoomInIcon, ZoomOutIcon,
  ChevronLeftIcon, ChevronDownIcon,
} from '@components/icons';
import type { EntityMapping, EntityRelation } from '@typedefs/index';
import { buildGraphData } from '@components/graphData';
import { getCanvasColors } from '@theme/constants';
import { useThemeMode } from '@theme/useThemeMode';

const nodeHandle = (color: string, bgColor: string) => ({
  width: 10, height: 10, background: color, border: `2px solid ${bgColor}`, borderRadius: '50%',
});
const hiddenHandle = { width: 10, height: 10, background: 'transparent', border: 'none', opacity: 0 };

function SourceNode({ data }: NodeProps) {
  const label = String(data.label ?? '');
  const fieldCount = (data.fieldCount ?? 0) as number;
  const bc = '#14b8a6';
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 2, borderColor: bc, borderRadius: '8px', minWidth: 200, overflow: 'hidden', boxShadow: `0 0 12px ${bc}22` }}>
      <Handle type="target" position={Position.Left} style={nodeHandle(bc, 'var(--canvas-bg, #0c1222)')} id="fk-src" />
      <Handle type="source" position={Position.Right} style={nodeHandle(bc, 'var(--canvas-bg, #0c1222)')} />
      <Handle type="source" position={Position.Left} style={hiddenHandle} id="fk-src-out" />
      <Box sx={{ px: 2, py: 1.25 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography sx={{ fontWeight: 700, fontSize: 13, flex: 1, color: 'text.primary' }}>{label}</Typography>
          {fieldCount > 0 && <Chip label={`${fieldCount}`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${bc}22`, color: bc }} />}
        </Stack>
      </Box>
    </Box>
  );
}

function DestNode({ data }: NodeProps) {
  const label = String(data.label ?? '');
  const fieldCount = (data.fieldCount ?? 0) as number;
  const bc = '#22c55e';
  return (
    <Box sx={{ bgcolor: 'background.paper', border: 2, borderColor: bc, borderRadius: '8px', minWidth: 200, overflow: 'hidden', boxShadow: `0 0 12px ${bc}22` }}>
      <Handle type="target" position={Position.Left} style={nodeHandle(bc, 'var(--canvas-bg, #0c1222)')} />
      <Handle type="source" position={Position.Right} style={nodeHandle(bc, 'var(--canvas-bg, #0c1222)')} id="fk-out" />
      <Handle type="target" position={Position.Right} style={hiddenHandle} id="fk-in" />
      <Box sx={{ px: 2, py: 1.25 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography sx={{ fontWeight: 700, fontSize: 13, flex: 1, color: 'text.primary' }}>{label}</Typography>
          {fieldCount > 0 && <Chip label={`${fieldCount}`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${bc}22`, color: bc }} />}
        </Stack>
      </Box>
    </Box>
  );
}

function FkLabelNode({ data }: NodeProps) {
  const label = String(data.label ?? '');
  return (
    <>
      <Handle type="target" position={Position.Left} style={hiddenHandle} />
      <Handle type="source" position={Position.Left} style={hiddenHandle} />
      <Handle type="target" position={Position.Right} style={hiddenHandle} id="r-in" />
      <Handle type="source" position={Position.Right} style={hiddenHandle} id="r-out" />
      <Box sx={{ bgcolor: 'rgba(245,158,11,0.12)', border: '1px solid', borderColor: 'warning.main', borderRadius: 1, px: 1, py: 0.25 }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'warning.main', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</Typography>
      </Box>
    </>
  );
}

function MappingNode({ data }: NodeProps) {
  const strategy = String(data.strategy ?? 'append');
  const mappingId = data.mappingId as number;
  const onDelete = data.onDelete as ((id: number) => void) | undefined;
  const color: 'error' | 'info' | 'warning' | 'default' = strategy === 'replace' ? 'error' : strategy === 'upsert' ? 'info' : strategy === 'cdc' ? 'warning' : 'default';
  return (
    <>
      <Handle type="target" position={Position.Left} style={nodeHandle('#64748b', 'transparent')} />
      <Handle type="source" position={Position.Right} style={nodeHandle('#64748b', 'transparent')} />
      <Box sx={{ bgcolor: 'background.paper', border: 2, borderColor: 'divider', borderRadius: '8px', px: 1, py: 0.5, cursor: 'pointer', '&:hover': { borderColor: 'text.disabled' } }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip label={strategy} size="small" color={color} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          {onDelete && (
            <Tooltip title="Delete mapping">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(mappingId); }} sx={{ p: 0.25 }} aria-label="Delete mapping">
                <TrashIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </>
  );
}

function CanvasToolbar({ panelOpen, onTogglePanel }: { panelOpen?: boolean; onTogglePanel?: () => void }) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  return (
    <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.25 }}>
      {onTogglePanel && (
        <Tooltip title={panelOpen ? 'Hide schema panel' : 'Show schema panel'}>
          <IconButton size="small" onClick={onTogglePanel} aria-label={panelOpen ? 'Hide schema panel' : 'Show schema panel'}>
            {panelOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronDownIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Fit all"><IconButton size="small" onClick={() => fitView({ padding: 0.3 })} aria-label="Fit all"><FitViewIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Zoom in"><IconButton size="small" onClick={() => zoomIn()} aria-label="Zoom in"><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Zoom out"><IconButton size="small" onClick={() => zoomOut()} aria-label="Zoom out"><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

const nodeTypes: NodeTypes = { source: SourceNode, dest: DestNode, mapping: MappingNode, fkLabel: FkLabelNode };

interface SchemaCanvasProps {
  mappings: EntityMapping[];
  relations: Record<string, EntityRelation[]>;
  onSelectMapping: (mapping: EntityMapping) => void;
  onDeleteMapping: (id: number) => void;
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

export default function SchemaCanvas({ mappings, relations, onSelectMapping, onDeleteMapping, panelOpen, onTogglePanel }: SchemaCanvasProps) {
  const { mode: themeMode } = useThemeMode();
  const [animated] = useState(true);

  const { initialNodes, initialEdges } = useMemo(
    () => buildGraphData(mappings, relations, onDeleteMapping),
    [mappings, relations, onDeleteMapping],
  );

  const filteredEdges = useMemo(() => initialEdges.map(e => ({
    ...e, animated: e.animated !== undefined ? (animated && e.animated) : animated,
  })), [initialEdges, animated]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(filteredEdges);
  }, [initialNodes, filteredEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'mapping') {
      const mapping = mappings.find((m) => m.id === node.data.mappingId);
      if (mapping) onSelectMapping(mapping);
    } else if (node.type === 'source') {
      const mapping = mappings.find((m) => m.source_entity === node.data.label);
      if (mapping) onSelectMapping(mapping);
    }
  }, [mappings, onSelectMapping]);

  const canvas = getCanvasColors(themeMode);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick} nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        style={{ background: canvas.background }}
      >
        <Background variant={BackgroundVariant.Dots} gap={canvas.dotGap} size={canvas.dotSize} color={canvas.grid} />
        <CanvasToolbar panelOpen={panelOpen} onTogglePanel={onTogglePanel} />
      </ReactFlow>
    </Box>
  );
}

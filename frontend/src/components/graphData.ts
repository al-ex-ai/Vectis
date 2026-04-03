import { Position, MarkerType, type Node, type Edge } from '@xyflow/react';
import type { EntityMapping, EntityRelation } from '@typedefs/index';

const SOURCE_X = 50;
const MID_X = 340;
const DEST_X = 560;
const Y_GAP = 90;
const FK_SRC_X = -160;
const FK_DEST_X = DEST_X + 280;

export interface GraphData {
  initialNodes: Node[];
  initialEdges: Edge[];
}

interface FkLink {
  fromEntity: string;
  toEntity: string;
  fromColumn: string;
  toColumn: string;
}

export function buildGraphData(
  mappings: EntityMapping[],
  relations: Record<string, EntityRelation[]>,
  onDeleteMapping?: (id: number) => void,
): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const sourceEntities = [...new Set(mappings.map((m) => m.source_entity))];
  const destTables = [...new Set(mappings.map((m) => m.dest_table))];
  const srcToDestTable: Record<string, string> = {};
  mappings.forEach((m) => {
    srcToDestTable[m.source_entity] = m.dest_table;
  });

  // Source entity nodes
  sourceEntities.forEach((entity, i) => {
    const entityMappings = mappings.filter((m) => m.source_entity === entity);
    const fieldCount = (() => {
      const fields: string[] = [];
      for (const m of entityMappings) {
        try {
          const cfg = JSON.parse(m.mapping_config || '{}');
          const cols = cfg.columns ?? cfg.column_map ?? {};
          fields.push(...Object.keys(cols));
        } catch {
          /* ignore */
        }
      }
      return fields.length;
    })();

    const srcLabel = entity.includes('.') ? entity.split('.').pop()! : entity;
    nodes.push({
      id: `src-${entity}`,
      type: 'source',
      position: { x: SOURCE_X, y: i * Y_GAP + 20 },
      data: { label: srcLabel, fieldCount },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Destination table nodes
  destTables.forEach((table, i) => {
    const tableName = table.includes('.') ? table.split('.').pop()! : table;
    const destMappings = mappings.filter((m) => m.dest_table === table);
    const fieldCount = (() => {
      const fields: string[] = [];
      for (const m of destMappings) {
        try {
          const cfg = JSON.parse(m.mapping_config || '{}');
          const cols = cfg.columns ?? cfg.column_map ?? {};
          fields.push(...(Object.values(cols) as string[]));
        } catch {
          /* ignore */
        }
      }
      return fields.length;
    })();

    nodes.push({
      id: `dest-${table}`,
      type: 'dest',
      position: { x: DEST_X, y: i * Y_GAP + 20 },
      data: { label: tableName, fieldCount },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Mapping nodes + edges
  mappings.forEach((m) => {
    const config = (() => {
      try {
        return JSON.parse(m.mapping_config || '{}');
      } catch {
        return {};
      }
    })();
    const strategy = config.load_strategy ?? 'append';
    const srcIdx = sourceEntities.indexOf(m.source_entity);
    const destIdx = destTables.indexOf(m.dest_table);
    const midY = ((srcIdx * Y_GAP + 20) + (destIdx * Y_GAP + 20)) / 2 + 15;

    nodes.push({
      id: `map-${m.id}`,
      type: 'mapping',
      position: { x: MID_X, y: midY },
      data: { strategy, mappingId: m.id, onDelete: onDeleteMapping },
    });

    edges.push({
      id: `e-src-${m.id}`,
      source: `src-${m.source_entity}`,
      target: `map-${m.id}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#14b8a6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6', width: 14, height: 14 },
    });

    edges.push({
      id: `e-dest-${m.id}`,
      source: `map-${m.id}`,
      target: `dest-${m.dest_table}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#22c55e', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e', width: 14, height: 14 },
    });
  });

  // FK links
  const fkLinks: FkLink[] = [];
  const fkSeen = new Set<string>();
  sourceEntities.forEach((entity) => {
    (relations[entity] ?? []).forEach((rel) => {
      const key = `${entity}-${rel.to_table}-${rel.from_column}`;
      if (fkSeen.has(key)) return;
      if (rel.to_table === entity) return;
      if (!sourceEntities.includes(rel.to_table) && !destTables.includes(rel.to_table)) return;
      fkSeen.add(key);
      fkLinks.push({
        fromEntity: entity,
        toEntity: rel.to_table,
        fromColumn: rel.from_column,
        toColumn: rel.to_column ?? 'Id',
      });
    });
  });

  const FK_STAGGER = 30;

  fkLinks.forEach((fk, i) => {
    const fromSrcIdx = sourceEntities.indexOf(fk.fromEntity);
    const toSrcIdx = sourceEntities.indexOf(fk.toEntity);
    const fromDestIdx = destTables.indexOf(srcToDestTable[fk.fromEntity]);
    const toDestIdx = destTables.indexOf(srcToDestTable[fk.toEntity] ?? fk.toEntity);

    if (fromSrcIdx >= 0 && toSrcIdx >= 0) {
      const midY = ((fromSrcIdx * Y_GAP + 20) + (toSrcIdx * Y_GAP + 20)) / 2;
      const staggeredY = midY + (i * FK_STAGGER) - ((fkLinks.length - 1) * FK_STAGGER / 2);
      const staggeredX = FK_SRC_X - (i * 20);
      const wpId = `fk-src-wp-${i}`;

      nodes.push({ id: wpId, type: 'fkLabel', position: { x: staggeredX, y: staggeredY }, data: { label: `FK: ${fk.fromColumn}`, fkSide: 'source' }, draggable: false, selectable: false });
      edges.push({ id: `fk-src-${i}-out`, source: `src-${fk.fromEntity}`, sourceHandle: 'fk-src', target: wpId, type: 'smoothstep', animated: false, style: { stroke: '#ff9800', strokeWidth: 2, strokeDasharray: '8 4' }, data: { fkSide: 'source' } });
      edges.push({ id: `fk-src-${i}-in`, source: wpId, target: `src-${fk.toEntity}`, targetHandle: 'fk-src', type: 'smoothstep', animated: false, style: { stroke: '#ff9800', strokeWidth: 2, strokeDasharray: '8 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ff9800', width: 14, height: 14 }, data: { fkSide: 'source' } });
    }

    if (fromDestIdx >= 0 && toDestIdx >= 0) {
      const midY = ((fromDestIdx * Y_GAP + 20) + (toDestIdx * Y_GAP + 20)) / 2;
      const staggeredY = midY + (i * FK_STAGGER) - ((fkLinks.length - 1) * FK_STAGGER / 2);
      const staggeredX = FK_DEST_X + (i * 20);
      const wpId = `fk-dest-wp-${i}`;
      const sourceDest = srcToDestTable[fk.fromEntity];
      const targetDest = srcToDestTable[fk.toEntity] ?? fk.toEntity;

      nodes.push({ id: wpId, type: 'fkLabel', position: { x: staggeredX, y: staggeredY }, data: { label: `FK: ${fk.fromColumn}`, fkSide: 'dest' }, draggable: false, selectable: false });
      edges.push({ id: `fk-dest-${i}-out`, source: `dest-${sourceDest}`, sourceHandle: 'fk-out', target: wpId, type: 'smoothstep', animated: false, style: { stroke: '#ff9800', strokeWidth: 2, strokeDasharray: '8 4' }, data: { fkSide: 'dest' } });
      edges.push({ id: `fk-dest-${i}-in`, source: wpId, target: `dest-${targetDest}`, targetHandle: 'fk-in', type: 'smoothstep', animated: false, style: { stroke: '#ff9800', strokeWidth: 2, strokeDasharray: '8 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ff9800', width: 14, height: 14 }, data: { fkSide: 'dest' } });
    }
  });

  return { initialNodes: nodes, initialEdges: edges };
}

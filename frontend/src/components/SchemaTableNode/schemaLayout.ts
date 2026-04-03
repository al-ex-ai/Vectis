import { type Node, type Edge, MarkerType } from '@xyflow/react';
import { getSchemaColor } from '@theme/constants';
import type { SchemaData } from './SchemaTableNode';

const TABLE_W = 280;
const GAP_X = 80;
const GAP_Y = 40;
const GROUP_PAD = 30;
const GROUP_HEADER = 50;

export interface EdgeFilters {
  showSameSchema: boolean;
  showCrossSchema: boolean;
  showLookup: boolean;
}

export function buildLayout(
  data: SchemaData,
  activeSchema: string | null,
  isDark: boolean,
  edgeFilters: EdgeFilters = { showSameSchema: true, showCrossSchema: true, showLookup: true },
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const schemaNames = Object.keys(data.schemas).sort();
  const filtered = activeSchema ? [activeSchema] : schemaNames;

  const fkMap: Record<string, Set<string>> = {};
  for (const r of data.relationships) {
    const fromKey = `${r.from_schema}.${r.from_table}`;
    if (!fkMap[fromKey]) fkMap[fromKey] = new Set();
    fkMap[fromKey].add(r.from_column);
  }

  let groupX = 0;

  for (const schema of filtered) {
    const tables = data.schemas[schema] || [];
    if (tables.length === 0) continue;
    const colors = getSchemaColor(schema, isDark);

    const cols = Math.min(Math.ceil(Math.sqrt(tables.length)), 4);
    const colHeights = new Array(cols).fill(GROUP_HEADER + GROUP_PAD);
    const tableHeights = tables.map(t => 32 + t.columns.length * 22 + 8);

    const tablePositions: Array<{ x: number; y: number; col: number }> = [];
    tables.forEach((_, idx) => {
      const col = idx < cols ? idx : colHeights.indexOf(Math.min(...colHeights));
      const x = groupX + GROUP_PAD + col * (TABLE_W + GAP_X);
      const y = colHeights[col];
      tablePositions.push({ x, y, col });
      colHeights[col] = y + tableHeights[idx] + GAP_Y;
    });

    const maxY = Math.max(...colHeights);
    const usedCols = Math.min(cols, tables.length);
    const groupW = usedCols * (TABLE_W + GAP_X) - GAP_X + GROUP_PAD * 2;
    const groupH = maxY + GROUP_PAD;

    nodes.push({
      id: `group-${schema}`,
      type: 'group',
      position: { x: groupX, y: 0 },
      style: {
        width: groupW,
        height: groupH,
        backgroundColor: colors.bg + '80',
        border: `1px solid ${colors.border}40`,
        borderRadius: 12,
        padding: 0,
      },
      data: { label: schema },
    });

    nodes.push({
      id: `label-${schema}`,
      type: 'default',
      position: { x: GROUP_PAD, y: 10 },
      parentId: `group-${schema}`,
      draggable: false,
      selectable: false,
      connectable: false,
      style: {
        background: 'transparent',
        border: 'none',
        color: colors.text,
        fontSize: 14,
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        padding: 0,
        width: 'auto',
        pointerEvents: 'none' as const,
      },
      data: { label: schema.toUpperCase() },
    });

    tables.forEach((t, idx) => {
      const key = `${schema}.${t.name}`;
      const pos = tablePositions[idx];
      nodes.push({
        id: key,
        type: 'tableNode',
        position: { x: pos.x - groupX, y: pos.y },
        parentId: `group-${schema}`,
        draggable: true,
        data: {
          table: t,
          schema,
          fkColumns: fkMap[key] || new Set(),
          pkColumns: new Set(t.primary_keys),
          isDark,
        },
      });
    });

    groupX += groupW + GROUP_PAD * 2;
  }

  const labelBgFill = isDark ? '#1e1e1e' : '#ffffff';
  for (const r of data.relationships) {
    const fromKey = `${r.from_schema}.${r.from_table}`;
    const toKey = `${r.to_schema}.${r.to_table}`;
    if (!nodes.find(n => n.id === fromKey) || !nodes.find(n => n.id === toKey)) continue;

    const isCrossSchema = r.from_schema !== r.to_schema;
    const isLookup = r.to_schema === 'lookup' || r.from_schema === 'lookup';

    if (isLookup && !edgeFilters.showLookup) continue;
    if (isCrossSchema && !isLookup && !edgeFilters.showCrossSchema) continue;
    if (!isCrossSchema && !isLookup && !edgeFilters.showSameSchema) continue;

    const colors = getSchemaColor(r.from_schema, isDark);

    edges.push({
      id: `${r.name}-${r.from_column}`,
      source: fromKey,
      target: toKey,
      sourceHandle: `${r.from_column}-source`,
      targetHandle: `${r.to_column}-target`,
      type: 'smoothstep',
      animated: isCrossSchema,
      style: { stroke: colors.accent, strokeWidth: 1.5, opacity: 0.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: colors.accent, width: 14, height: 14 },
      label: isCrossSchema ? r.from_column : undefined,
      labelStyle: { fontSize: 9, fill: isDark ? '#888' : '#999' },
      labelBgStyle: { fill: labelBgFill, fillOpacity: 0.8 },
    });
  }

  return { nodes, edges };
}

import { Typography, Box } from '@mui/material';
import { Position, Handle } from '@xyflow/react';
import { getSchemaColor } from '@theme/constants';

// ── Types ────────────────────────────────────────────────────────────

export interface Column { name: string; type: string; nullable: boolean; }
export interface Table { name: string; schema: string; columns: Column[]; primary_keys: string[]; row_count: number; }
export interface Relationship { name: string; from_schema: string; from_table: string; from_column: string; to_schema: string; to_table: string; to_column: string; }
export interface SchemaData { success: boolean; error?: string; database: string; schemas: Record<string, Table[]>; relationships: Relationship[]; table_count: number; schema_count: number; }

export interface TableNodeData {
  table: Table;
  schema: string;
  fkColumns: Set<string>;
  pkColumns: Set<string>;
  isDark: boolean;
  [key: string]: unknown;
}

// ── Table Node Component ─────────────────────────────────────────────

function TableNode({ data }: { data: TableNodeData }) {
  const { table, schema, fkColumns, pkColumns, isDark } = data;
  const colors = getSchemaColor(schema, isDark);

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: 2,
      borderColor: colors.border,
      borderRadius: 1.5,
      minWidth: 260,
      fontSize: '12px',
      overflow: 'hidden',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <Box sx={{
        bgcolor: colors.bg,
        borderBottom: 1,
        borderColor: colors.border,
        px: 1.5, py: 0.75,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '12px', color: colors.text }}>{table.name}</Typography>
        <Typography sx={{ fontSize: '10px', color: colors.text, opacity: 0.6 }}>{table.row_count.toLocaleString()}</Typography>
      </Box>

      {/* Columns */}
      {table.columns.map((col, i) => {
        const isPK = pkColumns.has(col.name);
        const isFK = fkColumns.has(col.name);
        return (
          <Box
            key={col.name}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 1.5,
              py: '3px',
              borderBottom: i < table.columns.length - 1
                ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                : 'none',
              position: 'relative',
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.name}-target`}
              style={{ background: isPK ? '#ffd54f' : colors.accent, width: 6, height: 6, border: 'none', left: -3 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isPK && <span style={{ fontSize: '9px' }}>🔑</span>}
              {isFK && !isPK && <span style={{ fontSize: '10px', color: colors.accent }}>→</span>}
              <Typography sx={{
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: isPK ? 700 : 400,
                color: isPK ? 'warning.main' : isFK ? colors.accent : 'text.secondary',
              }}>
                {col.name}
              </Typography>
            </Box>

            <Typography sx={{ fontSize: '10px', fontFamily: 'monospace', color: 'text.disabled', ml: 2 }}>
              {col.type}
            </Typography>

            <Handle
              type="source"
              position={Position.Right}
              id={`${col.name}-source`}
              style={{ background: isFK ? colors.accent : 'transparent', width: 6, height: 6, border: 'none', right: -3 }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

export default TableNode;

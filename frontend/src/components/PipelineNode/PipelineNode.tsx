import { Box, Typography, Stack, Chip, IconButton, CircularProgress, LinearProgress } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import { TrashIcon } from '@components/icons';
import { getStatusColor, statusHex } from '@theme/constants';

interface PipelineNodeData {
  pipeline: { id: number; name: string; tags: string };
  stepResult: { status: string; run_id: number | null; error: string | null } | null;
  tags: string[];
  onDelete?: (id: number) => void;
  onViewRun?: (runId: number) => void;
  designMode?: boolean;
  isDark?: boolean;
  [key: string]: unknown;
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function PipelineNode({ data }: { data: PipelineNodeData }) {
  const { pipeline, stepResult, tags, onDelete, onViewRun, designMode, isDark } = data;
  const dark = isDark !== false;
  const status = stepResult?.status ?? 'pending';
  const c = getStatusColor(status, dark);
  const handleBorder = dark ? '#111' : '#fff';

  return (
    <Box
      sx={{
        bgcolor: c.bg,
        border: 2,
        borderColor: c.border,
        borderRadius: '8px',
        minWidth: 240,
        maxWidth: 320,
        overflow: 'hidden',
        boxShadow: c.glow,
        transition: 'all 0.3s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: c.border, width: 10, height: 10, border: `2px solid ${handleBorder}` }}
      />

      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: c.text, flex: 1 }}>
            {pipeline.name}
          </Typography>
          {status === 'running' && <CircularProgress size={16} sx={{ color: c.text }} />}
          {status === 'completed' && (
            <Box sx={{ color: statusHex('completed') }}>
              <CheckIcon />
            </Box>
          )}
          {status === 'failed' && (
            <Box sx={{ color: statusHex('failed') }}>
              <XCircleIcon />
            </Box>
          )}
          {status === 'pending' && !designMode && (
            <Box sx={{ color: 'text.disabled' }}>
              <ClockIcon />
            </Box>
          )}
          {designMode && onDelete && (
            <IconButton
              size="small"
              aria-label={`Remove ${pipeline.name} from flow`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(pipeline.id);
              }}
              sx={{
                color: c.text,
                opacity: 0.5,
                '&:hover': { color: 'error.main', opacity: 1 },
                ml: 0.5,
                p: 0.25,
              }}
            >
              <TrashIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 600,
                bgcolor: 'action.hover',
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          ))}
        </Stack>

        {status === 'running' && (
          <LinearProgress
            sx={{
              mt: 1,
              height: 3,
              borderRadius: 1,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: c.border },
            }}
          />
        )}

        {stepResult?.run_id && status !== 'pending' && (
          <Typography
            onClick={(e) => {
              e.stopPropagation();
              if (onViewRun && stepResult.run_id) onViewRun(stepResult.run_id);
            }}
            sx={{
              fontSize: 10,
              color: status === 'failed' ? statusHex('failed') : 'text.disabled',
              mt: 0.5,
              cursor: 'pointer',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Run #{stepResult.run_id}
            {stepResult.error && status === 'failed' ? ` — ${stepResult.error}` : ''} — view
            details
          </Typography>
        )}
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: c.border, width: 10, height: 10, border: `2px solid ${handleBorder}` }}
      />
    </Box>
  );
}

export type { PipelineNodeData };

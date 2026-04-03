import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  LinearProgress,
  Pagination,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { TrashIcon, RunsIcon } from '@components/icons';
import { api } from '@services/api';
import { fmtTs } from '@utils/formatters';
import { runStatusColor } from '@utils/constants';
import type { PipelineRun } from '@typedefs/index';
import * as sx from './Runs.styles';

interface RunsResponse {
  runs: PipelineRun[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export default function Runs() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '';

  const loadRuns = useCallback(
    (p: number = 1, ps: number = pageSize) => {
      setLoading(true);
      const qs = projectId
        ? `?project_id=${projectId}&page=${p}&page_size=${ps}`
        : `?page=${p}&page_size=${ps}`;
      api
        .get<RunsResponse | PipelineRun[]>(`/runs${qs}`)
        .then((data) => {
          if (Array.isArray(data)) {
            setRuns(data);
            setTotalPages(1);
            setTotal(data.length);
          } else {
            setRuns(data.runs);
            setTotalPages(data.total_pages);
            setTotal(data.total);
            setPage(data.page);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    },
    [projectId, pageSize],
  );

  useEffect(() => {
    loadRuns(1);
  }, [loadRuns]);

  const handlePageChange = (_: unknown, value: number) => {
    setPage(value);
    loadRuns(value, pageSize);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
    loadRuns(1, value);
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    api
      .del(`/runs/${deleteId}`)
      .then(() => {
        setDeleteId(null);
        loadRuns();
      })
      .catch(console.error);
  };

  return (
    <Box sx={sx.pageWrapper}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Pipeline Runs
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Execution history and progress
          </Typography>
        </Box>
        {total > 0 && (
          <Typography variant="body2" color="text.secondary">
            {total} total runs
          </Typography>
        )}
      </Stack>

      <Box sx={sx.listContainer}>
        {loading ? (
          <Box sx={sx.loadingContainer}>
            <CircularProgress size={28} />
          </Box>
        ) : runs.length === 0 ? (
          <Box sx={sx.emptyState}>
            <RunsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No pipeline runs yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Execute a pipeline to see results here
            </Typography>
          </Box>
        ) : (
          runs.map((r) => {
            const isComplete = r.status === 'completed' || r.status === 'failed';
            const progress =
              r.total_records > 0
                ? (r.processed_records / r.total_records) * 100
                : isComplete
                  ? 100
                  : 0;

            return (
              <Card
                key={r.id}
                variant="outlined"
                role="button"
                tabIndex={0}
                aria-label={`View run ${r.pipeline_name}, status ${r.status}`}
                sx={sx.runCard}
                onClick={() => navigate(`${basePath}/runs/${r.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`${basePath}/runs/${r.id}`);
                  }
                }}
              >
                <CardContent sx={sx.runCardContent}>
                  <Box sx={sx.runGrid}>
                    {/* Col 1: Name + started */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {r.pipeline_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Started: {fmtTs(r.started_at)}
                      </Typography>
                    </Box>

                    {/* Col 2: Progress bar (hidden xs) */}
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {r.total_records > 0
                          ? `${r.processed_records.toLocaleString()} / ${r.total_records.toLocaleString()} records`
                          : `${r.processed_records.toLocaleString()} records`}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={sx.progressBar}
                      />
                    </Box>

                    {/* Col 3: Failed count (hidden xs) */}
                    <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      {r.failed_records > 0 && (
                        <Typography variant="caption" color="error">
                          {r.failed_records.toLocaleString()} failed
                        </Typography>
                      )}
                    </Box>

                    {/* Col 4: Status chip + delete on xs */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Chip
                        label={r.status}
                        size="small"
                        color={runStatusColor(r.status)}
                        sx={sx.statusChip}
                      />
                      <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                          aria-label={`Delete run ${r.id}`}
                        >
                          <TrashIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Col 5: Completed time (hidden xs) */}
                    <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      {r.completed_at && (
                        <Typography variant="caption" color="text.secondary">
                          {fmtTs(r.completed_at)}
                        </Typography>
                      )}
                    </Box>

                    {/* Col 6: Delete */}
                    <Box sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                      <Tooltip title="Delete run">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(r.id);
                          }}
                          aria-label={`Delete run ${r.id}`}
                        >
                          <TrashIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={sx.paginationBar}
      >
        <Stack direction="row" alignItems="center" spacing={1} justifyContent={{ xs: 'space-between', sm: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Rows per page:
          </Typography>
          <FormControl size="small" variant="outlined">
            <Select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              sx={sx.pageSizeSelect}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" size="small" sx={{ '& .MuiPagination-ul': { justifyContent: { xs: 'center', sm: 'flex-end' } } }} />
      </Stack>

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Run</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the run and all its transfer logs. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

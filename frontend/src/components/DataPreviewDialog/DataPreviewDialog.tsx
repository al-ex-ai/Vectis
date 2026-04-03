import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import { ChevronLeftIcon, CloseIcon } from '@components/icons';
import { api } from '@services/api';
import { themedScrollbar } from '@utils/styles';
import type { TablePreview } from '@typedefs/index';

interface DataPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: number;
  tableName: string;
}

export default function DataPreviewDialog({
  open,
  onClose,
  connectionId,
  tableName,
}: DataPreviewDialogProps) {
  const [data, setData] = useState<TablePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      setError('');
      try {
        const result = await api.get<TablePreview>(
          `/preview/${connectionId}/${encodeURIComponent(tableName)}?page=${p}&page_size=${pageSize}`,
        );
        if (!result.success) {
          setError(result.error ?? 'Unknown error');
          setData(null);
        } else {
          setData(result);
          setPage(p);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    },
    [connectionId, tableName],
  );

  useEffect(() => {
    if (open && connectionId && tableName) {
      setData(null);
      setPage(1);
      fetchPage(1);
    }
  }, [open, connectionId, tableName, fetchPage]);

  const truncate = (val: unknown, max = 120): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return s.length > max ? s.slice(0, max) + '...' : s;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ sx: { width: '90vw', maxWidth: 1200, height: '80vh' } }}
    >
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}
      >
        <Box>
          <Typography variant="h6" component="span">
            {tableName.includes('.') ? tableName.split('.').pop() : tableName}
          </Typography>
          {data?.success && (
            <Chip label={`${data.total.toLocaleString()} rows`} size="small" sx={{ ml: 1.5 }} />
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close preview">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {loading && !data && (
          <Box
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}
          >
            <CircularProgress />
          </Box>
        )}

        {data?.success && (
          <>
            <TableContainer sx={{ flex: 1, ...themedScrollbar }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: 'background.paper',
                        minWidth: 40,
                        color: 'text.secondary',
                      }}
                    >
                      #
                    </TableCell>
                    {data.columns.map((col) => (
                      <TableCell
                        key={col}
                        sx={{ fontWeight: 700, bgcolor: 'background.paper', whiteSpace: 'nowrap' }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      {data.columns.map((col) => (
                        <TableCell
                          key={col}
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8rem',
                          }}
                        >
                          {row[col] === null ? (
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.disabled', fontStyle: 'italic' }}
                            >
                              NULL
                            </Typography>
                          ) : (
                            truncate(row[col])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {data.rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={data.columns.length + 1}
                        sx={{ textAlign: 'center', py: 4 }}
                      >
                        <Typography color="text.secondary">No data in this table</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {data.total_pages > 1 && (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}
              >
                <Typography variant="caption" color="text.secondary">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total)} of{' '}
                  {data.total.toLocaleString()}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Button
                    size="small"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchPage(page - 1)}
                    startIcon={<ChevronLeftIcon />}
                  >
                    Prev
                  </Button>
                  <Typography variant="caption">
                    Page {page} of {data.total_pages}
                  </Typography>
                  <Button
                    size="small"
                    disabled={page >= data.total_pages || loading}
                    onClick={() => fetchPage(page + 1)}
                  >
                    Next
                  </Button>
                </Stack>
              </Stack>
            )}
          </>
        )}

        {loading && data && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.3)',
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

import type React from 'react';
import {
  Typography, Box, Paper, Stack, Chip, Card, Collapse,
  TextField, IconButton, Tabs, Tab, Tooltip, CircularProgress,
} from '@mui/material';
import {
  PlusIcon as AddIcon, CheckCircleIcon,
  EyeIcon as VisibilityIcon,
} from '@components/icons';
import { themedScrollbar } from '@utils/styles';
import type { CrmEntity, EntityColumn, EntityRelation } from '@typedefs/index';

export default function SchemaPanel({
  open, schemaTab, onSchemaTabChange,
  entities, destEntities, searchQuery, onSearchChange,
  mappedEntities, entityAttrs, expandedEntity,
  onExpandEntity, onQuickAdd, onPreview,
}: {
  open: boolean;
  schemaTab: number;
  onSchemaTabChange: (tab: number) => void;
  entities: CrmEntity[];
  destEntities: CrmEntity[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mappedEntities: Set<string>;
  entityAttrs: Record<string, { attributes: EntityColumn[]; relations: EntityRelation[] }>;
  expandedEntity: string | null;
  onExpandEntity: (name: string) => void;
  onQuickAdd: (entity: CrmEntity, e: React.MouseEvent) => void;
  onPreview: (table: string) => void;
}) {
  const filteredEntities = entities.filter((e) =>
    !searchQuery || e.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || e.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Paper sx={{ width: open ? { xs: '100%', sm: 340 } : 0, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', bgcolor: 'background.default', borderRight: open ? '1px solid' : 'none', borderColor: 'divider', borderRadius: 0, position: { xs: 'absolute', sm: 'relative' }, zIndex: { xs: 10, sm: 'auto' }, height: { xs: '100%', sm: 'auto' } }}>
      {open && (
        <Tabs value={schemaTab} onChange={(_, v) => onSchemaTabChange(v)} variant="fullWidth" sx={{ flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label={`Source (${entities.length})`} sx={{ fontSize: '0.75rem', minHeight: 40 }} />
          <Tab label={`Destination (${destEntities.length})`} sx={{ fontSize: '0.75rem', minHeight: 40 }} />
        </Tabs>
      )}
      <Box sx={{ p: 2, flex: 1, overflowY: 'auto', ...themedScrollbar }}>
        {schemaTab === 0 ? (
          <SourceEntities
            entities={filteredEntities} allCount={entities.length}
            searchQuery={searchQuery} onSearchChange={onSearchChange}
            mappedEntities={mappedEntities} entityAttrs={entityAttrs}
            expandedEntity={expandedEntity} onExpandEntity={onExpandEntity}
            onQuickAdd={onQuickAdd}
          />
        ) : (
          <DestEntities
            entities={destEntities} expandedEntity={expandedEntity}
            onExpandEntity={onExpandEntity} onPreview={onPreview}
          />
        )}
      </Box>
    </Paper>
  );
}

function SourceEntities({
  entities, allCount, searchQuery, onSearchChange,
  mappedEntities, entityAttrs, expandedEntity, onExpandEntity, onQuickAdd,
}: {
  entities: CrmEntity[];
  allCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mappedEntities: Set<string>;
  entityAttrs: Record<string, { attributes: EntityColumn[]; relations: EntityRelation[] }>;
  expandedEntity: string | null;
  onExpandEntity: (name: string) => void;
  onQuickAdd: (entity: CrmEntity, e: React.MouseEvent) => void;
}) {
  return (
    <>
      {allCount > 0 && (
        <TextField size="small" placeholder="Search entities..." fullWidth sx={{ mb: 1 }} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
      )}
      {entities.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          {allCount === 0 ? 'Click "Discover Schema" to load source entities' : 'No matches'}
        </Typography>
      ) : entities.map((e) => (
        <Card key={e.name} variant="outlined" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, cursor: 'pointer', overflow: 'hidden' }} onClick={() => onExpandEntity(e.name)}>
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Typography variant="body2" fontWeight={600} noWrap>{e.display_name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{e.name}</Typography>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
              {e.is_intersect && <Chip label="M2M" size="small" variant="outlined" sx={{ height: 20, borderColor: 'divider', color: 'text.secondary', fontSize: '0.6rem' }} />}
              {e.is_custom && <Chip label="Custom" size="small" variant="outlined" sx={{ height: 20, borderColor: 'divider', color: 'text.secondary', fontSize: '0.6rem' }} />}
              {mappedEntities.has(e.name) ? (
                <CheckCircleIcon fontSize="small" color="success" titleAccess="Mapped" />
              ) : (
                <IconButton size="small" color="primary" aria-label={`Add ${e.display_name} mapping`} onClick={(ev) => onQuickAdd(e, ev)}><AddIcon fontSize="small" /></IconButton>
              )}
            </Stack>
          </Box>
          <Collapse in={expandedEntity === e.name}>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {entityAttrs[e.name] ? (
                <>
                  {entityAttrs[e.name].attributes.slice(0, 15).map((a) => (
                    <Box key={a.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption">{a.display_name || a.name} {a.is_primary_id && <Chip label="PK" size="small" sx={{ height: 16, fontSize: '0.6rem' }} color="error" />}</Typography>
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">{a.type}</Typography>
                    </Box>
                  ))}
                  {entityAttrs[e.name].attributes.length > 15 && (
                    <Typography variant="caption" color="text.secondary">+{entityAttrs[e.name].attributes.length - 15} more</Typography>
                  )}
                  {entityAttrs[e.name].relations.length > 0 && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                      {entityAttrs[e.name].relations.slice(0, 5).map((r) => (
                        <Typography key={r.name} variant="caption" color="primary" display="block">
                          FK: {r.from_column} &rarr; {r.to_table}.{r.to_column}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </>
              ) : <CircularProgress size={16} />}
            </Box>
          </Collapse>
        </Card>
      ))}
    </>
  );
}

function DestEntities({
  entities, expandedEntity, onExpandEntity, onPreview,
}: {
  entities: CrmEntity[];
  expandedEntity: string | null;
  onExpandEntity: (name: string) => void;
  onPreview: (table: string) => void;
}) {
  return entities.length === 0 ? (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
      Click "Discover Schema" to load destination tables
    </Typography>
  ) : (
    <>
      {entities.map((e) => (
        <Card key={e.name} variant="outlined" sx={{ mb: 1 }}>
          <Box sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => onExpandEntity(`dest:${e.name}`)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Tooltip title="Preview data">
                  <IconButton size="small" onClick={(ev) => { ev.stopPropagation(); onPreview(e.name); }} aria-label={`Preview ${e.name}`}>
                    <VisibilityIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Chip label={`${e.columns?.length ?? 0} cols`} size="small" variant="outlined" />
              </Stack>
            </Box>
          </Box>
          <Collapse in={expandedEntity === `dest:${e.name}`}>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {(e.columns ?? []).slice(0, 20).map((c) => (
                <Box key={c.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption">{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">{c.type}{c.nullable ? '' : ' NOT NULL'}</Typography>
                </Box>
              ))}
              {(e.columns?.length ?? 0) > 20 && (
                <Typography variant="caption" color="text.secondary">+{(e.columns?.length ?? 0) - 20} more</Typography>
              )}
              {(e.relations ?? []).length > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                  {(e.relations ?? []).slice(0, 5).map((r) => (
                    <Typography key={`${r.from_column}-${r.to_table}`} variant="caption" color="success.main" display="block">
                      FK: {r.from_column} &rarr; {r.to_table}.{r.to_column}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </Card>
      ))}
    </>
  );
}

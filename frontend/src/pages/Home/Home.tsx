import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Stack,
  Chip,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  VectisIcon,
  PipelinesIcon,
  FlowsIcon,
  RunsIcon,
  PlusIcon,
  SchemaIcon,
  ConnectionsIcon,
  GearIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  ScheduleIcon,
  UsersIcon,
} from '@components/icons';
import { api } from '@services/api';
import { fmtTs } from '@utils/formatters';
import type { Project } from '@typedefs/index';
import * as sx from './Home.styles';

interface DashboardStats {
  connections: number;
  pipelines: number;
  flows: number;
  active_runs: number;
}

interface StatDef {
  key: keyof DashboardStats;
  label: string;
}

const STATS_DEF: StatDef[] = [
  { key: 'pipelines', label: 'Pipelines' },
  { key: 'flows', label: 'Flows' },
  { key: 'connections', label: 'Connections' },
  { key: 'active_runs', label: 'Active Runs' },
];

interface FeatureDef {
  title: string;
  description: string;
  icon: React.ElementType;
}

const FEATURES: FeatureDef[] = [
  {
    title: 'Pipelines',
    description: 'Define entity mappings between any source and destination with field-level column control, filters, and load strategies.',
    icon: PipelinesIcon,
  },
  {
    title: 'Visual Flows',
    description: 'Chain pipelines into dependency graphs. Drag-and-drop flow designer with parallel and sequential execution modes.',
    icon: FlowsIcon,
  },
  {
    title: 'Plugin System',
    description: 'Extensible connector and provider architecture. Built-in Dynamics 365, Salesforce, SQL Server, and PostgreSQL. Add more via pip.',
    icon: GearIcon,
  },
  {
    title: 'Schema Explorer',
    description: 'Interactive ER diagram of your database. View tables, columns, types, primary keys, and foreign key relationships.',
    icon: SchemaIcon,
  },
  {
    title: 'Connections',
    description: 'Configure CRM APIs and SQL databases with secure credential storage. Test connections and discover schemas instantly.',
    icon: ConnectionsIcon,
  },
  {
    title: 'Run History',
    description: 'Track every pipeline and flow run with real-time progress, record counts, batch logs, and error details.',
    icon: RunsIcon,
  },
  {
    title: 'Scheduling',
    description: 'Cron-based pipeline and flow execution with overlap policies. Automate data sync on any schedule, from hourly to weekly.',
    icon: ScheduleIcon,
  },
  {
    title: 'Team Management',
    description: 'Organizations with role-based access. Owners, admins, editors, and viewers. Invite-only registration with JWT authentication.',
    icon: UsersIcon,
  },
  {
    title: 'Multiple Providers',
    description: 'SQL Server, Azure SQL, PostgreSQL, MySQL as destinations. Each provider handles bulk insert, upsert, and schema management.',
    icon: DatabaseIcon,
  },
  {
    title: 'Validation',
    description: 'Pre-run validation checks entity names, column mappings, filters, and primary keys against live sources before execution.',
    icon: ShieldCheckIcon,
  },
];

const QUICK_STEPS = [
  { number: 1, title: 'Invite Your Team', description: 'Add team members with the right roles. Admins, editors, and viewers.' },
  { number: 2, title: 'Set up Connections', description: 'Add source (CRM/API) and destination (SQL) credentials.' },
  { number: 3, title: 'Create a Project', description: 'Organize your pipelines, flows, and schedules into a project.' },
  { number: 4, title: 'Build Pipelines', description: 'Map entities from source to destination with field-level control.' },
  { number: 5, title: 'Create Flows', description: 'Chain pipelines with dependencies in the visual flow designer.' },
  { number: 6, title: 'Schedule & Monitor', description: 'Automate runs on a cron schedule. Track progress and review history.' },
];

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primary = theme.palette.primary.main;

  useEffect(() => {
    api.get<DashboardStats>('/dashboard').then(setStats).catch(() => {});
    api.get<Project[]>('/projects').then(setProjects).catch(() => {}).finally(() => setLoadingProjects(false));
  }, []);

  return (
    <Box sx={sx.page}>
      {/* ── Top bar ── */}
      <Box sx={sx.topBar}>
        <Box sx={sx.brand}>
          <Box sx={sx.logoMark(`linear-gradient(135deg, ${primary}, ${theme.palette.primary.dark})`)}>
            <VectisIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={sx.brandText}>Vectis</Typography>
            <Typography sx={sx.subtitle}>Open source ETL platform</Typography>
          </Box>
        </Box>

        <Box sx={sx.statsRow}>
          {STATS_DEF.map((s) => {
            const value = stats ? (stats[s.key] ?? 0) : null;
            return (
              <Box key={s.key} sx={sx.statPill(alpha(primary, isDark ? 0.08 : 0.05))}>
                {value === null ? (
                  <Skeleton variant="text" width={18} height={18} />
                ) : (
                  <Typography sx={sx.statValue}>{value}</Typography>
                )}
                <Typography sx={sx.statLabel}>{s.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Bento layout ── */}
      <Box sx={sx.bentoGrid}>
        {/* Left column */}
        <Box sx={sx.bentoCol}>
          {/* Features */}
          <Box sx={{ ...sx.sectionCard(isDark) as object, flex: { xs: 'none', md: 1 } }}>
            <Box sx={sx.sectionHeader}>
              <Typography sx={sx.sectionTitle}>Capabilities</Typography>
            </Box>
            <Box sx={sx.sectionBody}>
              <Box sx={sx.featureGrid}>
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <Box key={f.title} sx={sx.featureTile(alpha(primary, 0.4))}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={sx.featureIconWrap(alpha(primary, isDark ? 0.12 : 0.08))}>
                          <Icon sx={{ fontSize: 18, color: 'primary.main' }} />
                        </Box>
                        <Typography sx={sx.featureTitle}>{f.title}</Typography>
                      </Box>
                      <Typography sx={sx.featureDesc}>{f.description}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Right column */}
        <Box sx={sx.bentoCol}>
          {/* Projects */}
          <Box sx={{ ...sx.sectionCard(isDark) as object, flex: { xs: 'none', md: 1 } }}>
            <Box sx={sx.sectionHeader}>
              <Typography sx={sx.sectionTitle}>Projects ({projects.length})</Typography>
              <Button
                size="small"
                startIcon={<PlusIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/projects')}
                sx={sx.createBtn}
              >
                New
              </Button>
            </Box>
            <Box sx={sx.sectionBody}>
              {loadingProjects ? (
                <Stack spacing={1.5}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : projects.length === 0 ? (
                <Box sx={sx.emptyState}>
                  <VectisIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">No projects yet</Typography>
                  <Button variant="outlined" size="small" startIcon={<PlusIcon />} onClick={() => navigate('/projects')} sx={sx.createBtn}>
                    Create Project
                  </Button>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {projects.map((proj) => (
                    <Box key={proj.id} sx={sx.projectRow(isDark)} onClick={() => navigate(`/projects/${proj.id}`)}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={sx.projectName}>{proj.name}</Typography>
                        {proj.description && (
                          <Typography sx={sx.projectDesc}>{proj.description}</Typography>
                        )}
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                          {fmtTs(proj.created_at)}
                        </Typography>
                      </Box>
                      <Box sx={sx.projectMeta}>
                        <Chip label={`${proj.pipeline_count ?? 0} pipes`} size="small" sx={sx.chip} />
                        {(proj.active_runs ?? 0) > 0 && (
                          <Chip label={`${proj.active_runs} live`} size="small" color="primary" sx={sx.chip} />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          {/* Quick Start */}
          <Box sx={sx.sectionCard(isDark)}>
            <Box sx={sx.sectionHeader}>
              <Typography sx={sx.sectionTitle}>Quick Start</Typography>
            </Box>
            <Box sx={sx.sectionBody}>
              <Box sx={sx.stepsTimeline}>
                {QUICK_STEPS.map((step, idx) => (
                  <Box key={step.number} sx={sx.stepRow}>
                    {idx < QUICK_STEPS.length - 1 && <Box sx={sx.stepLine} />}
                    <Box sx={sx.stepNum(primary)}>{step.number}</Box>
                    <Box sx={{ pt: 0.25 }}>
                      <Typography sx={sx.stepTitle}>{step.title}</Typography>
                      <Typography sx={sx.stepDesc}>{step.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

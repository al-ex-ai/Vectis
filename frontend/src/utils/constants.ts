export const CONNECTION_TYPES = [
  { value: 'sqlserver', label: 'SQL Server', group: 'database' },
  { value: 'azure_sql', label: 'Azure SQL', group: 'database' },
  { value: 'mysql', label: 'MySQL', group: 'database' },
  { value: 'postgresql', label: 'PostgreSQL', group: 'database' },
  { value: 'dynamics_crm', label: 'Dynamics 365 CRM', group: 'crm' },
  { value: 'salesforce', label: 'Salesforce', group: 'crm' },
] as const;

export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONNECTION_TYPES.map((t) => [t.value, t.label]),
);

export const typeLabel = (t: string): string => TYPE_LABELS[t] ?? t;

export const API_TYPES = new Set(['dynamics_crm', 'salesforce']);
export const SQL_TYPES = new Set(['sqlserver', 'azure_sql', 'mysql', 'postgresql']);

export type StatusColor = 'success' | 'error' | 'info' | 'warning' | 'default';

export const runStatusColor = (s: string): StatusColor => {
  if (s === 'completed') return 'success';
  if (s === 'failed') return 'error';
  if (s?.startsWith('running')) return 'info';
  return 'default';
};

export const pipelineStatusColor = (s: string): StatusColor => {
  if (s === 'active') return 'success';
  if (s === 'draft') return 'warning';
  return 'default';
};

export const API_ENDPOINTS = {
  PROJECTS: '/projects',
  CONNECTIONS: '/connections',
  PIPELINES: '/pipelines',
  FLOWS: '/flows',
  RUNS: '/runs',
  SCHEDULES: '/schedules',
} as const;

export const UI_TEXT = {
  common: {
    loading: 'Loading...',
    noData: 'No data available',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    close: 'Close',
    create: 'Create',
    edit: 'Edit',
    start: 'Start',
    resume: 'Resume',
    viewAll: 'View All',
    rowsPerPage: 'Rows per page:',
    records: 'records',
    failed: 'failed',
    running: 'running',
    inProgress: 'in progress...',
    backToRuns: 'Back to runs',
    backToFlows: 'Back to flows',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'ETL Pipeline Overview',
    connections: 'Connections',
    pipelines: 'Pipelines',
    flows: 'Flows',
    activeRuns: 'Active Runs',
    recentRuns: 'Recent Runs',
    recentFlowRuns: 'Recent Flow Runs',
    emptyPipelineRuns: 'No pipeline runs yet. Create a pipeline to get started.',
    emptyFlowRuns: 'No flow runs yet. Create a flow to orchestrate pipelines.',
    started: 'Started',
  },
  home: {
    brand: 'Vectis',
    tagline: 'Open source ETL platform with visual flow designer and plugin architecture',
    tabFeatures: 'Features',
    tabQuickStart: 'Quick Start',
    tabProjects: 'Projects',
    createProject: 'Create Project',
    createNewProject: 'Create New Project',
    emptyProjects: 'No projects yet. Create your first project to get started.',
    features: {
      pipelines: {
        title: 'Pipelines',
        description: 'Define entity mappings between any source and destination with field-level column control, filters, and load strategies.',
      },
      visualFlows: {
        title: 'Visual Flows',
        description: 'Chain pipelines into dependency graphs. Drag-and-drop flow designer with parallel and sequential execution modes.',
      },
      pluginSystem: {
        title: 'Plugin System',
        description: 'Extensible connector and provider architecture. Built-in Dynamics 365, Salesforce, SQL Server, and PostgreSQL. Add more via pip.',
      },
      schemaExplorer: {
        title: 'Schema Explorer',
        description: 'Interactive ER diagram of your database. View tables, columns, types, primary keys, and foreign key relationships.',
      },
      connections: {
        title: 'Connections',
        description: 'Configure CRM APIs and SQL databases with secure credential storage. Test connections and discover schemas instantly.',
      },
      runHistory: {
        title: 'Run History',
        description: 'Track every pipeline and flow run with real-time progress, record counts, batch logs, and error details.',
      },
      scheduling: {
        title: 'Scheduling',
        description: 'Cron-based pipeline and flow execution with overlap policies. Automate data sync on any schedule, from hourly to weekly.',
      },
      teamManagement: {
        title: 'Team Management',
        description: 'Organizations with role-based access. Owners, admins, editors, and viewers. Invite-only registration with JWT authentication.',
      },
      multipleProviders: {
        title: 'Multiple Providers',
        description: 'SQL Server, Azure SQL, PostgreSQL, MySQL as destinations. Each provider handles bulk insert, upsert, and schema management.',
      },
      validation: {
        title: 'Validation',
        description: 'Pre-run validation checks entity names, column mappings, filters, and primary keys against live sources before execution.',
      },
    },
    quickSteps: {
      inviteTeam: { title: 'Invite Your Team', description: 'Add team members with the right roles. Admins, editors, and viewers.' },
      setupConnections: { title: 'Set up Connections', description: 'Add source (CRM/API) and destination (SQL) credentials.' },
      createProject: { title: 'Create a Project', description: 'Organize your pipelines, flows, and schedules into a project.' },
      buildPipelines: { title: 'Build Pipelines', description: 'Map entities from source to destination with field-level control.' },
      createFlows: { title: 'Create Flows', description: 'Chain pipelines with dependencies in the visual flow designer.' },
      scheduleAndMonitor: { title: 'Schedule & Monitor', description: 'Automate runs on a cron schedule. Track progress and review history.' },
    },
  },
  projects: {
    title: 'Projects',
    subtitle: 'Organize your pipelines into projects',
    newProject: 'New Project',
    editProject: 'Edit Project',
    projectCreated: 'Project created',
    emptyTitle: 'Get started by creating your first project',
    emptySubtitle: 'Projects help you organize pipelines and connections',
    dialogTitleNew: 'New Project',
    dialogTitleEdit: 'Edit Project',
    fieldName: 'Name',
    fieldDescription: 'Description',
  },
  runs: {
    title: 'Pipeline Runs',
    subtitle: 'Execution history and progress',
    totalRuns: 'total runs',
    emptyTitle: 'No pipeline runs yet',
    emptySubtitle: 'Execute a pipeline to see results here',
    deleteRun: 'Delete run',
    deleteDialogTitle: 'Delete Run',
    deleteDialogMessage: 'This will permanently delete the run and all its transfer logs. Continue?',
    started: 'Started:',
  },
  runDetail: {
    runTitle: 'Run #',
    cdcSync: 'CDC sync',
    error: 'Error',
    transferLog: 'Transfer Log',
    recordsProcessed: 'records processed',
    fetched: 'fetched',
    stats: {
      records: 'Records',
      failed: 'Failed',
      batches: 'Batches',
      batchSize: 'Batch Size',
      duration: 'Duration',
    },
    tableHeaders: {
      table: 'Table',
      batch: 'Batch',
      records: 'Records',
      status: 'Status',
      time: 'Time',
      preview: 'Preview',
    },
    started: 'Started:',
    completed: 'Completed:',
  },
  flowDesigner: {
    editName: 'Edit name',
    designing: 'Designing',
    design: 'Design',
    addPipeline: 'Add Pipeline',
    runFlow: 'Run Flow',
    history: 'History',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fitView: 'Fit View',
    flowNotFound: 'Flow not found',
    emptyFlow: 'No pipelines in this flow',
    emptyFlowAction: 'Add pipelines to get started',
    allPipelinesAdded: 'All pipelines are already in this flow',
    flowRunHistory: 'Flow Run History',
    noRunsYet: 'No runs yet',
    editFlow: 'Edit Flow',
    executionMode: 'Execution Mode',
    parallel: 'Parallel',
    sequential: 'Sequential',
    maxConcurrent: 'Max Concurrent',
    staggerDelay: 'Stagger Delay (sec)',
    sequentialDescription: 'Pipelines run one at a time following dependency order.',
    fieldName: 'Name',
    fieldDescription: 'Description',
  },
  flows: {
    title: 'Flows',
    subtitle: 'Pipeline orchestration — chain pipelines with dependencies',
    createFlow: 'Create Flow',
    emptyTitle: 'No flows yet',
    emptySubtitle: 'Create a flow to orchestrate multiple pipelines',
    emptyAction: 'Create your first flow',
    deleteDialogTitle: 'Delete Flow',
    deleteDialogMessage: 'This will permanently delete this flow and all its run history. Continue?',
    dialogTitleCreate: 'Create Flow',
    fieldName: 'Name',
    fieldDescription: 'Description',
    tooltipOpen: 'Open',
    tooltipEdit: 'Edit',
    tooltipDelete: 'Delete',
  },
  plugins: {
    title: 'Plugins',
    subtitle: 'Manage source connectors and database providers',
    installed: 'installed',
    connectors: 'Connectors',
    providers: 'Providers',
    activeConnections: 'Active Connections',
    tabAll: 'All',
    tabSourceConnectors: 'Source Connectors',
    tabDbProviders: 'DB Providers',
    emptyTitle: 'No plugins installed',
    emptyHint: 'pip install vectis-connector-hubspot',
    source: 'source',
    destination: 'destination',
    builtIn: 'built-in',
    required: 'required',
    secret: 'secret',
    detail: {
      status: 'Status',
      active: 'Active',
      connections: 'Connections',
      type: 'Type',
      about: 'About',
      supportedConnectionTypes: 'Supported Connection Types',
      configurationSchema: 'Configuration Schema',
      installation: 'Installation',
      builtInNote: 'Built-in plugin — included with Vectis installation',
    },
  },
} as const;

export const MESSAGES = {
  CONFIRM_DELETE: 'Are you sure you want to delete this item?',
  SAVE_SUCCESS: 'Saved successfully',
  SAVE_ERROR: 'Failed to save. Please try again.',
  DELETE_SUCCESS: 'Deleted successfully',
  DELETE_ERROR: 'Failed to delete. Please try again.',
  CONNECTION_TEST_SUCCESS: 'Connection successful',
  CONNECTION_TEST_FAILED: 'Connection failed',
  LOADING: 'Loading...',
  NO_DATA: 'No data available',
} as const;

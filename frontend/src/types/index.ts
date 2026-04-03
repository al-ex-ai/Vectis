// ── Core Domain Types ────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  description: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  pipeline_count?: number;
  active_runs?: number;
  stats?: {
    pipelines: number;
    connections: number;
    active_runs: number;
    recent_runs: PipelineRun[];
  };
}

export interface Connection {
  id: number;
  name: string;
  type: string;
  description: string;
  created_at: string;
  config?: Record<string, string>;
}

export interface Pipeline {
  id: number;
  name: string;
  description: string;
  source_connection_id: number;
  dest_connection_id: number;
  source_name?: string;
  source_type?: string;
  dest_name?: string;
  dest_type?: string;
  dest_schema?: string;
  project_id?: number;
  status: string;
  config?: string;
  tags?: string[];
  settings?: string | Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface EntityMapping {
  id: number;
  pipeline_id: number;
  source_entity: string;
  dest_table: string;
  mapping_config: string;
  transform_type: string;
  sort_order: number;
  created_at: string;
}

export interface PipelineRun {
  id: number;
  pipeline_id: number;
  pipeline_name?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  batch_size: number;
  error_message?: string;
  started_by?: string;
}

export interface CrmEntity {
  name: string;
  logical_name?: string;
  display_name: string;
  entity_set_name?: string;
  primary_id?: string;
  primary_name?: string;
  is_custom?: boolean;
  is_intersect?: boolean;
  columns?: EntityColumn[];
  relations?: EntityRelation[];
}

export interface EntityColumn {
  name: string;
  display_name?: string;
  type: string;
  required?: boolean;
  nullable?: boolean;
  max_length?: number;
  is_primary_id?: boolean;
  is_primary_name?: boolean;
}

export interface EntityRelation {
  name: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

export interface TablePreview {
  success: boolean;
  error?: string;
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Flow Types ───────────────────────────────────────────────────────

export interface Flow {
  id: number;
  project_id: number;
  name: string;
  description: string;
  steps: FlowStep[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface FlowStep {
  pipeline_id: number;
  depends_on: number[];
  position?: { x: number; y: number };
}

export interface FlowRun {
  id: number;
  flow_id: number;
  status: string;
  started_at: string;
  completed_at?: string;
  step_results: StepResult[];
  started_by?: string;
}

export interface StepResult {
  pipeline_id: number;
  run_id?: number;
  status: string;
  error?: string;
}

// ── Schedule Types ──────────────────────────────────────────────────

export interface Schedule {
  id: number;
  name: string;
  description: string;
  target_type: 'pipeline' | 'flow';
  pipeline_id?: number;
  flow_id?: number;
  project_id?: number;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  overlap_policy: string;
  last_run_at?: string;
  last_status?: string;
  next_run_at?: string;
  run_count: number;
  pipeline_name?: string;
  flow_name?: string;
  created_at: string;
  updated_at?: string;
}

// ── Auth Types ───────────────────────────────────────────────────────

export interface Organization {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: number;
  org_id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
  organization: Organization;
}

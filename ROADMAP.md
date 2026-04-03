# Vectis Roadmap

## Priority 1 — Core Platform

### Authentication & Multi-Tenant
- JWT-based login with user/password
- User model: email, hashed password, role (admin/editor/viewer)
- Auth endpoints: /auth/login, /auth/register, /auth/me
- Middleware protecting all /api/v1/* routes
- Users/teams own projects and connections
- Role-based access to pipelines and runs
- Dependencies already in place: python-jose, passlib[bcrypt], secret_key in config

### Scheduling
- Cron-based pipeline and flow execution
- Schedule model: pipeline_id/flow_id, cron expression, enabled flag, last_run, next_run
- Background scheduler (APScheduler or custom asyncio loop)
- UI: schedule picker in pipeline settings drawer
- Biggest gap — ETL without scheduling is a manual tool

### Notifications
- Email/Slack/Teams alerts on run success, failure, or warnings
- Settings drawer already has notification fields, just needs send logic
- Notification channels: configure per-project or per-pipeline
- Templates for different event types

## Priority 2 — Connectors & Providers

### MySQL / MariaDB Provider
- Same pattern as PostgreSQL provider
- asyncmy or aiomysql for async access
- Trivial to implement, broadens audience significantly

### Generic REST API Connector
- Configurable: base URL, auth (API key, OAuth2, Bearer), pagination strategy
- JSON response → flat record mapping
- Covers HubSpot, Stripe, Shopify, Zendesk without per-vendor plugins
- Config schema: url, auth_type, headers, pagination_type (offset/cursor/link)

### MongoDB Source Connector
- Document-to-relational ETL
- Flatten nested documents into table columns
- Handle arrays as separate child tables
- motor (async MongoDB driver)

### CSV / Excel Source
- File upload → parse → map → load
- Support for column headers, type inference, encoding detection
- Drag-and-drop in the UI
- Good for one-off data imports and migrations

### Azure Blob / AWS S3 Source
- Large file-based pipelines
- Stage data in cloud storage before loading
- Support CSV, JSON, Parquet formats
- Integration with file-based scheduling (watch folder)

## Priority 3 — Platform Features

### Run History Dashboard
- Charts: run durations, record counts, failure rates over time
- Trend detection: runs getting slower, error rates increasing
- Per-pipeline and global views
- Export run reports

### Data Lineage
- Visual trace from source field through transforms to dest column
- Mapping configs already contain the data, just needs visualization
- Impact analysis: "if I remove this source field, what breaks?"
- Cross-pipeline lineage for flows

### Incremental Sync Improvements
- Watermark tracking: persist last sync timestamp per entity
- Change detection via hash comparison for sources without CDC
- Merge patterns: soft delete, slowly changing dimensions
- Resume from last successful batch on failure

### Pipeline Templates
- Save a working pipeline config as a reusable template
- Clone for new environments (dev → beta → prod)
- Template marketplace for common integrations
- Parameterized templates (connection IDs as variables)

### Webhooks
- Trigger pipelines from external events
- Incoming: POST /api/v1/webhooks/{pipeline_id}/trigger
- Outgoing: notify external systems on run completion
- Webhook secret validation

### Dry Run Mode
- Preview what would happen without writing to destination
- Show: record counts, schema changes needed, FK conflicts
- Side-by-side diff of source vs existing dest data
- Validation-only execution path

## Priority 4 — AI Features

### Smart Column Mapping
- AI suggests source-to-dest column matches when adding a mapping
- Based on name similarity, data types, and sample data
- Handles renames like dac_programid → ProgramId, emailaddress1 → PrimaryEmail
- Single API call to Claude when user expands a mapping

### Natural Language Pipeline Builder
- "Load all CRM accounts and contacts into the warehouse" → creates pipeline
- Uses discovered schema as context
- Auto-sets dependency order and FK relations
- Chat-style interface in the flow designer

### Data Quality Rules from Description
- "Flag accounts with no email and revenue over 100k" → generates filter conditions
- Converts natural language to mapping config filters
- Suggest validation rules before pipeline runs

### Error Diagnosis
- When a pipeline run fails, AI analyzes: error + mapping config + sample data
- Instead of raw stack trace: "The contact has a parentcustomerid that doesn't exist in accounts yet. Move accounts before contacts."
- Actionable fix suggestions with one-click apply

### Schema Diff & Migration
- Compare source and dest schemas
- Suggest ALTER TABLE statements for new columns, type mismatches
- Detect breaking changes before they cause failures

### SQL Generation from Intent
- In schema explorer: "top 10 accounts by revenue with contact count" → SQL
- Run generated query, show results
- Save as a view or export

### Mapping Config Review
- Pre-run AI review of pipeline configuration
- Detect: strategy mismatches (replace parent + append child), missing FKs, orphan risks
- Confidence score per mapping

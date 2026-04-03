# Vectis

Open source ETL platform with visual flow designer and plugin architecture.

Move data between any data source using visual pipelines, dependency-aware flows, and an extensible plugin system. Built-in connectors for Dynamics 365, SQL Server, and PostgreSQL. Add any data source via the plugin API.

## Features

- **Visual Flow Designer** — Drag-and-drop pipeline orchestration with React Flow. Define dependencies between pipelines, run in parallel or sequential, track execution in real-time.
- **Pipeline Builder** — Map entities from source to destination with field-level column control, filters, static values, load strategies (append/replace/upsert/CDC), and batch configuration.
- **Schema Explorer** — Interactive ER diagram with table nodes, column details, primary keys, and foreign key relationships. Filter by schema, toggle FK visibility.
- **Scheduling** — Cron-based scheduling for pipelines and flows. Preset patterns (hourly, daily, weekly, monthly), timezone support, overlap policies (skip/queue/allow), run history tracking.
- **Run Monitoring** — Real-time progress tracking with batch-level transfer logs. Per-record status, error details, run history with duration and record counts.
- **Connection Management** — Configure and test database connections before use. Supports multiple connection types with credential validation.
- **Multi-Project** — Organize pipelines, flows, connections, and schedules into isolated projects with per-project dashboards showing stats and recent activity.
- **Team Management** — Role-based access control with four roles: owner, admin, editor, viewer. User invitations, organization-scoped data isolation.
- **Plugin Architecture** — Extensible connector and provider system. Built-in Dynamics 365, SQL Server, PostgreSQL. Add custom plugins via pip.
- **Dashboard** — Project-level overview with connection, pipeline, flow, and active run counts. Recent pipeline and flow run history at a glance.
- **Dark/Light Themes** — Three theme modes (Vectis dark, light, system dark) with cookie-persisted preference.
- **Demo Mode** — Read-only deployment mode for showcasing. Blocks all mutations, displays demo credentials on login, configurable via environment variables.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5, MUI 7, React Flow, Zustand, Vite 8 |
| Backend | Python 3.13, FastAPI (async), SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 17 (production), SQLite (development) |
| Auth | JWT with sliding-window refresh, API keys, RBAC |
| Scheduling | APScheduler with cron triggers |
| Deployment | Docker + docker-compose |



## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+
- PostgreSQL 16+ (or Docker)

### Development

```bash
# Clone
git clone https://github.com/vectis-etl/vectis.git
cd vectis

# Start databases (3 PostgreSQL instances: app, source test data, destination test data)
cp docker/.env.example docker/.env
# Edit docker/.env — set VECTIS_DB_PASSWORD and VECTIS_SECRET_KEY
cd docker && docker compose -f docker-compose.dev.yml up -d && cd ..

# Backend
cd backend
cp .env.example .env
# Edit .env with your database password
pip install -e ".[dev]"
uvicorn vectis.app:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app seeds demo data automatically on first run.

**Demo account:** `admin@vectis.dev` / `admin123`

### Docker (all-in-one)

```bash
cp docker/.env.example docker/.env
# Edit docker/.env — set VECTIS_DB_PASSWORD and VECTIS_SECRET_KEY
cd docker && docker compose up
```

### Development Databases

The dev setup includes three PostgreSQL databases:

| Database | Port | Purpose |
|----------|------|---------|
| `vectis` | 5440 | Application data (projects, pipelines, runs, users) |
| `source_crm` | 5441 | Test source with CRM and e-commerce schemas, many-to-many tables |
| `dest_warehouse` | 5442 | Test destination with warehouse star-schema tables |

The source database is pre-seeded with realistic data across two schemas:
- **CRM** — accounts, contacts, deals, products, campaigns, tags with M2M junction tables (contact_accounts, deal_products, campaign_contacts, account_tags, deal_tags)
- **E-Commerce** — stores, products, variants, categories, collections, customers, orders, wishlists with M2M junction tables (product_categories, product_tags, product_collections, order_items, wishlist_products)

## Project Structure

```
vectis/
├── frontend/                # React SPA
│   └── src/
│       ├── components/      # Layout, PipelineNode, SchemaTableNode, MappingCard, icons
│       ├── pages/           # 17 route pages (Home, Dashboard, Pipelines, Flows, Runs, Schema, etc.)
│       ├── stores/          # Zustand (auth, notifications, demo mode)
│       ├── services/        # Typed API client
│       ├── theme/           # Vectis/light/dark themes, constants
│       ├── types/           # TypeScript domain types
│       └── utils/           # Constants, formatters, styles
├── backend/
│   └── src/vectis/
│       ├── api/v1/          # FastAPI route modules (auth, pipelines, flows, schedules, mappings, etc.)
│       ├── core/            # Config, security (JWT, password hashing)
│       ├── db/              # SQLAlchemy async engine and session
│       ├── models/          # ORM models (10 models)
│       ├── schemas/         # Pydantic request/response schemas
│       ├── services/        # Business logic (ETL engine, flow engine, scheduler, connection service)
│       └── plugins/         # Connector + provider plugin system
│           ├── connectors/  # Dynamics 365, PostgreSQL
│           └── providers/   # SQL Server, PostgreSQL
├── docker/                  # Docker, compose (dev + prod), init SQL scripts
└── .github/workflows/       # CI (lint, type check, tests)
```

## Plugins

Vectis uses a plugin system for source connectors and database providers.

### Built-in Plugins

| Plugin | Type | Connection Types |
|--------|------|-----------------|
| Dynamics 365 | Connector | `dynamics_crm` |
| SQL Server | Provider | `sqlserver`, `azure_sql` |
| PostgreSQL | Provider | `postgresql` |

### Creating a Plugin

Implement `SourceConnector` or `DBProvider` and register with the global registry:

```python
from vectis.plugins.connectors.base import SourceConnector
from vectis.plugins.registry import PluginInfo, registry

class MyConnector(SourceConnector):
    async def test_connection(self) -> bool: ...
    async def discover_entities(self) -> list[Entity]: ...
    async def discover_attributes(self, entity_name: str) -> list[Attribute]: ...
    async def fetch_data(self, entity_name: str, **kwargs) -> AsyncIterator[dict]: ...
    async def get_count(self, entity_name: str) -> int: ...

registry.register_connector(
    PluginInfo(name="My Source", type="connector", ...),
    MyConnector,
)
```

Install third-party plugins via pip:

```bash
pip install vectis-connector-hubspot
```

## Environment Variables

### Backend (`VECTIS_` prefix)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VECTIS_DATABASE_URL` | Yes | SQLite | PostgreSQL connection string |
| `VECTIS_SECRET_KEY` | Production | Auto-generated in debug | JWT signing key |
| `VECTIS_DEBUG` | No | `false` | Enable debug mode |
| `VECTIS_DEMO_MODE` | No | `false` | Read-only demo mode |
| `VECTIS_DEMO_EMAIL` | No | — | Pre-filled email on login page |
| `VECTIS_DEMO_PASSWORD` | No | — | Pre-filled password on login page |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://127.0.0.1:8000/api/v1` | Backend API URL |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and PR guidelines.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md). Do not open public issues for security bugs.

## License

[Apache 2.0](LICENSE)

## Links

- [Changelog](CHANGELOG.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guide](CONTRIBUTING.md)

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from vectis import __version__
from vectis.api.v1 import router as v1_router
from vectis.core.config import settings
from vectis.db.engine import init_db

_DEMO_ALLOWED = frozenset({"/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/health"})


class DemoModeMiddleware(BaseHTTPMiddleware):
    """Block all mutating requests when VECTIS_DEMO_MODE=true."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.url.path.rstrip("/") not in _DEMO_ALLOWED:
            return JSONResponse(
                status_code=403,
                content={"detail": "Demo mode: read-only access"},
            )
        return await call_next(request)


async def seed_demo_data() -> None:
    """Seed local dev data from seed_data.json (DataBridge beta export)."""
    import json
    from pathlib import Path

    from sqlalchemy import select

    from vectis.db.engine import async_session
    from vectis.models.connection import Connection
    from vectis.models.flow import Flow
    from vectis.models.pipeline import EntityMapping, Pipeline
    from vectis.models.project import Project

    async with async_session() as session:
        existing = (await session.execute(select(Project))).scalars().first()
        if existing:
            return

        seed_path = Path(__file__).resolve().parent.parent.parent / "seed_data.json"
        if not seed_path.exists():
            print("[seed] seed_data.json not found, skipping")
            return

        data = json.loads(seed_path.read_text())

        # Track old ID -> new ID mappings for FK references
        conn_id_map: dict[int, int] = {}
        project_id_map: dict[int, int] = {}
        pipeline_id_map: dict[int, int] = {}

        # Projects
        for p in data.get("projects", []):
            project = Project(
                name=p["name"],
                description=p.get("description") or "",
                created_by=p.get("created_by") or "system",
            )
            session.add(project)
            await session.flush()
            project_id_map[p["id"]] = project.id

        # Connections — config from env var (config_env) or inline (config)
        import os

        for c in data.get("connections", []):
            config = c.get("config") or {}
            if not config and c.get("config_env"):
                env_val = os.environ.get(c["config_env"], "")
                if env_val:
                    config = json.loads(env_val)
            conn = Connection(
                name=c["name"],
                type=c["type"],
                description=c.get("description") or "",
                config=config,
                created_by=c.get("created_by") or "system",
            )
            session.add(conn)
            await session.flush()
            conn_id_map[c["id"]] = conn.id

        # Pipelines
        for p in data.get("pipelines", []):
            pipeline = Pipeline(
                name=p["name"],
                description=p.get("description") or "",
                source_connection_id=conn_id_map[p["source_connection_id"]],
                dest_connection_id=conn_id_map[p["dest_connection_id"]],
                project_id=project_id_map.get(p.get("project_id")) if p.get("project_id") else None,
                status=p.get("status") or "draft",
                config=p.get("config"),
                tags=json.loads(p["tags"]) if isinstance(p.get("tags"), str) else (p.get("tags") or []),
                settings=p.get("settings"),
                created_by=p.get("created_by") or "",
            )
            session.add(pipeline)
            await session.flush()
            pipeline_id_map[p["id"]] = pipeline.id

        # Entity Mappings
        for m in data.get("mappings", []):
            mapping = EntityMapping(
                pipeline_id=pipeline_id_map[m["pipeline_id"]],
                source_entity=m["source_entity"],
                dest_table=m["dest_table"],
                mapping_config=m.get("mapping_config") or "{}",
                transform_type=m.get("transform_type") or "direct",
                sort_order=m.get("sort_order") or 0,
            )
            session.add(mapping)

        # Flows — remap pipeline IDs in steps
        for f in data.get("flows", []):
            steps = []
            for step in f.get("steps") or []:
                steps.append({
                    "pipeline_id": pipeline_id_map.get(step["pipeline_id"], step["pipeline_id"]),
                    "x": step.get("x", 0),
                    "y": step.get("y", 0),
                    "depends_on": [
                        pipeline_id_map.get(dep, dep) for dep in step.get("depends_on", [])
                    ],
                })
            flow = Flow(
                name=f["name"],
                description=f.get("description") or "",
                project_id=project_id_map.get(f.get("project_id")) if f.get("project_id") else None,
                steps=steps,
                created_by=f.get("created_by") or "system",
            )
            session.add(flow)

        await session.commit()
        print(
            f"[seed] Loaded from seed_data.json: "
            f"{len(data.get('projects', []))} projects, "
            f"{len(data.get('connections', []))} connections, "
            f"{len(data.get('pipelines', []))} pipelines, "
            f"{len(data.get('mappings', []))} mappings, "
            f"{len(data.get('flows', []))} flows"
        )


async def seed_default_org_and_user() -> None:
    """Ensure a default organization and admin user exist for development."""
    from sqlalchemy import select

    from vectis.core.security import hash_password
    from vectis.db.engine import async_session
    from vectis.models.organization import Organization
    from vectis.models.user import User

    async with async_session() as session:
        existing = (await session.execute(select(Organization))).scalars().first()
        if existing:
            return

        org = Organization(name="Vectis Dev", slug="vectis-dev")
        session.add(org)
        await session.flush()

        admin = User(
            org_id=org.id,
            email="admin@vectis.dev",
            hashed_password=hash_password("admin123"),
            name="Admin",
            role="owner",
        )
        session.add(admin)
        await session.commit()
        print(f"[seed] Created default org '{org.name}' and admin user '{admin.email}'")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await init_db()
    await seed_default_org_and_user()

    # Rich demo seed (replaces seed_demo_data for new installs)
    from vectis.db.engine import async_session
    from vectis.seed import seed_demo

    async with async_session() as session:
        await seed_demo(session)

    from vectis.services import scheduler as scheduler_mod

    sched = scheduler_mod.Scheduler()
    scheduler_mod.scheduler = sched
    await sched.start()

    yield

    await sched.shutdown()
    scheduler_mod.scheduler = None


app = FastAPI(
    title="Vectis",
    description="Open source ETL platform with visual flow designer",
    version=__version__,
    lifespan=lifespan,
)

if settings.demo_mode:
    app.add_middleware(DemoModeMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "https://vectis.al-ex.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)

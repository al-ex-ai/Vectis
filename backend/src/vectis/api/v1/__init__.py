from fastapi import APIRouter

from vectis.api.v1 import (
    auth,
    connections,
    dashboard,
    flows,
    health,
    mappings,
    pipelines,
    plugins,
    preview,
    projects,
    runs,
    schedules,
)
from vectis.plugins.registry import autodiscover

# Auto-discover and register all connector/provider plugins
autodiscover()

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(health.router)
router.include_router(dashboard.router)
router.include_router(projects.router)
router.include_router(connections.router)
router.include_router(pipelines.router)
router.include_router(flows.router)
router.include_router(runs.router)
router.include_router(mappings.router)
router.include_router(plugins.router)
router.include_router(preview.router)
router.include_router(schedules.router)

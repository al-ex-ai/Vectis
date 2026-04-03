import asyncio

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.user import User
from vectis.schemas.common import SuccessResponse
from vectis.schemas.schedules import ScheduleCreate, ScheduleResponse, ScheduleUpdate
from vectis.services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["schedules"], dependencies=[Depends(get_current_user)])


async def get_service(session: AsyncSession = Depends(get_session)) -> ScheduleService:
    return ScheduleService(session)


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(
    project_id: int | None = Query(default=None),
    target_type: str | None = Query(default=None),
    service: ScheduleService = Depends(get_service),
) -> list[ScheduleResponse]:
    return await service.list_all(project_id=project_id, target_type=target_type)


@router.post("/", response_model=ScheduleResponse)
async def create_schedule(
    data: ScheduleCreate,
    _user: User = Depends(require_editor),
    service: ScheduleService = Depends(get_service),
) -> ScheduleResponse:
    resp = await service.create(data)
    _sync_scheduler(resp.id, enabled=resp.enabled)
    return resp


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    service: ScheduleService = Depends(get_service),
) -> ScheduleResponse:
    return await service.get_by_id(schedule_id)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    _user: User = Depends(require_editor),
    service: ScheduleService = Depends(get_service),
) -> ScheduleResponse:
    resp = await service.update(schedule_id, data)
    _sync_scheduler(resp.id, enabled=resp.enabled)
    return resp


@router.delete("/{schedule_id}", response_model=SuccessResponse)
async def delete_schedule(
    schedule_id: int,
    _user: User = Depends(require_editor),
    service: ScheduleService = Depends(get_service),
) -> SuccessResponse:
    await service.delete(schedule_id)
    _remove_from_scheduler(schedule_id)
    return SuccessResponse()


@router.post("/{schedule_id}/pause", response_model=ScheduleResponse)
async def pause_schedule(
    schedule_id: int,
    _user: User = Depends(require_editor),
    service: ScheduleService = Depends(get_service),
) -> ScheduleResponse:
    resp = await service.set_enabled(schedule_id, enabled=False)
    _sync_scheduler(resp.id, enabled=False)
    return resp


@router.post("/{schedule_id}/resume", response_model=ScheduleResponse)
async def resume_schedule(
    schedule_id: int,
    _user: User = Depends(require_editor),
    service: ScheduleService = Depends(get_service),
) -> ScheduleResponse:
    resp = await service.set_enabled(schedule_id, enabled=True)
    _sync_scheduler(resp.id, enabled=True)
    return resp


_sync_bg_tasks: set[asyncio.Task[None]] = set()


def _sync_scheduler(schedule_id: int, *, enabled: bool) -> None:
    """Sync a schedule with the running APScheduler instance (if active)."""
    from vectis.services.scheduler import scheduler

    if scheduler is None:
        return
    if enabled:
        task = asyncio.create_task(_reload_schedule_job(schedule_id))
        _sync_bg_tasks.add(task)
        task.add_done_callback(_sync_bg_tasks.discard)
    else:
        scheduler.remove(schedule_id)


async def _reload_schedule_job(schedule_id: int) -> None:
    """Reload a single schedule from DB and register it with the scheduler."""
    from sqlalchemy import select

    from vectis.db.engine import async_session
    from vectis.models.schedule import Schedule
    from vectis.services.scheduler import scheduler

    if scheduler is None:
        return
    async with async_session() as session:
        result = await session.execute(select(Schedule).where(Schedule.id == schedule_id))
        s = result.scalar_one_or_none()
        if s and s.enabled:
            scheduler.add_or_update(s)


def _remove_from_scheduler(schedule_id: int) -> None:
    from vectis.services.scheduler import scheduler

    if scheduler is not None:
        scheduler.remove(schedule_id)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.user import User
from vectis.schemas.common import SuccessResponse
from vectis.schemas.runs import RunDetailResponse, RunListItem, RunListResponse
from vectis.services.run_service import RunService

router = APIRouter(prefix="/runs", tags=["runs"], dependencies=[Depends(get_current_user)])


async def get_service(session: AsyncSession = Depends(get_session)) -> RunService:
    return RunService(session)


@router.get("/", response_model=RunListResponse)
async def list_runs(
    project_id: int | None = Query(default=None),
    page: int = Query(default=1),
    page_size: int = Query(default=10),
    service: RunService = Depends(get_service),
) -> RunListResponse:
    return await service.list_runs(project_id=project_id, page=page, page_size=page_size)


@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run(
    run_id: int,
    service: RunService = Depends(get_service),
) -> RunDetailResponse:
    return await service.get_run(run_id)


@router.post("/{run_id}/cancel", response_model=SuccessResponse)
async def cancel_run(
    run_id: int,
    _user: User = Depends(require_editor),
    service: RunService = Depends(get_service),
) -> SuccessResponse:
    await service.cancel_run(run_id)
    return SuccessResponse()


@router.post("/{run_id}/resume")
async def resume_run(
    run_id: int,
    _user: User = Depends(require_editor),
    service: RunService = Depends(get_service),
) -> RunListItem:
    return await service.resume_run(run_id)


@router.delete("/{run_id}", response_model=SuccessResponse)
async def delete_run(
    run_id: int,
    _user: User = Depends(require_editor),
    service: RunService = Depends(get_service),
) -> SuccessResponse:
    await service.delete_run(run_id)
    return SuccessResponse()

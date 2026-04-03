import asyncio

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.flow_run import FlowRun
from vectis.models.user import User
from vectis.schemas.common import SuccessResponse
from vectis.schemas.flows import FlowCreate, FlowResponse, FlowRunResponse, FlowUpdate
from vectis.services.flow_service import FlowService

router = APIRouter(prefix="/flows", tags=["flows"], dependencies=[Depends(get_current_user)])


async def get_service(session: AsyncSession = Depends(get_session)) -> FlowService:
    return FlowService(session)


@router.get("/", response_model=list[FlowResponse])
async def list_flows(
    project_id: int | None = Query(default=None),
    service: FlowService = Depends(get_service),
) -> list[FlowResponse]:
    return await service.list_flows(project_id=project_id)


@router.post("/", response_model=FlowResponse)
async def create_flow(
    data: FlowCreate,
    _user: User = Depends(require_editor),
    service: FlowService = Depends(get_service),
) -> FlowResponse:
    return await service.create(data)


@router.get("/{flow_id}", response_model=FlowResponse)
async def get_flow(
    flow_id: int,
    service: FlowService = Depends(get_service),
) -> FlowResponse:
    return await service.get_by_id(flow_id)


@router.put("/{flow_id}", response_model=FlowResponse)
async def update_flow(
    flow_id: int,
    data: FlowUpdate,
    _user: User = Depends(require_editor),
    service: FlowService = Depends(get_service),
) -> FlowResponse:
    return await service.update(flow_id, data)


@router.delete("/{flow_id}", response_model=SuccessResponse)
async def delete_flow(
    flow_id: int,
    _user: User = Depends(require_editor),
    service: FlowService = Depends(get_service),
) -> SuccessResponse:
    await service.delete(flow_id)
    return SuccessResponse()


@router.get("/{flow_id}/runs", response_model=list[FlowRunResponse])
async def list_flow_runs(
    flow_id: int,
    service: FlowService = Depends(get_service),
) -> list[FlowRunResponse]:
    return await service.list_runs(flow_id)


@router.get("/runs/{run_id}", response_model=FlowRunResponse)
async def get_flow_run(
    run_id: int,
    service: FlowService = Depends(get_service),
) -> FlowRunResponse:
    return await service.get_run(run_id)


@router.post("/runs/{run_id}/cancel", response_model=SuccessResponse)
async def cancel_flow_run(
    run_id: int,
    _user: User = Depends(require_editor),
    service: FlowService = Depends(get_service),
) -> SuccessResponse:
    return await service.cancel_run(run_id)


_flow_bg_tasks: set[asyncio.Task[None]] = set()


@router.post("/{flow_id}/run", response_model=FlowRunResponse)
async def run_flow(
    flow_id: int,
    _user: User = Depends(require_editor),
    service: FlowService = Depends(get_service),
) -> FlowRunResponse:
    """Start a flow run -- executes pipelines in dependency order."""
    from datetime import UTC, datetime

    from vectis.db.engine import async_session
    from vectis.services.flow_engine import run_flow as execute_flow

    flow = await service._get_or_404(flow_id)

    flow_run = FlowRun(
        flow_id=flow_id,
        status="running",
        started_at=datetime.now(UTC),
        started_by="vectis",
    )
    service.session.add(flow_run)
    await service.session.commit()
    await service.session.refresh(flow_run)

    flow_data = {"steps": flow.steps}

    task = asyncio.create_task(
        execute_flow(flow_run.id, flow_data, async_session)
    )
    _flow_bg_tasks.add(task)
    task.add_done_callback(_flow_bg_tasks.discard)

    return FlowRunResponse.model_validate(flow_run)

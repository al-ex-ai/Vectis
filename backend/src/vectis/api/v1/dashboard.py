from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user
from vectis.db.engine import get_session
from vectis.models.connection import Connection
from vectis.models.flow import Flow
from vectis.models.flow_run import FlowRun
from vectis.models.pipeline import Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.schemas.runs import RunListItem

router = APIRouter(tags=["dashboard"], dependencies=[Depends(get_current_user)])


class DashboardStats(BaseModel):
    connections: int
    pipelines: int
    flows: int
    active_runs: int
    recent_runs: list[RunListItem]
    recent_flow_runs: list[object]


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    project_id: int | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> DashboardStats:
    conn_count = (await session.execute(select(func.count(Connection.id)))).scalar_one()

    pipe_q = select(func.count(Pipeline.id))
    if project_id:
        pipe_q = pipe_q.where(Pipeline.project_id == project_id)
    pipe_count = (await session.execute(pipe_q)).scalar_one()

    flow_q = select(func.count(Flow.id))
    if project_id:
        flow_q = flow_q.where(Flow.project_id == project_id)
    flow_count = (await session.execute(flow_q)).scalar_one()

    active_q = select(func.count(PipelineRun.id)).where(PipelineRun.status.like("running%"))
    active_count = (await session.execute(active_q)).scalar_one()

    runs_q = select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(5)
    runs_result = await session.execute(runs_q)
    recent_runs = []
    for r in runs_result.scalars().all():
        pipe_result = await session.execute(select(Pipeline.name).where(Pipeline.id == r.pipeline_id))
        pipe_name = pipe_result.scalar_one_or_none() or f"Pipeline {r.pipeline_id}"
        recent_runs.append(RunListItem(
            id=r.id,
            pipeline_id=r.pipeline_id,
            pipeline_name=pipe_name,
            status=r.status,
            started_at=r.started_at,
            completed_at=r.completed_at,
            total_records=r.total_records,
            processed_records=r.processed_records,
            failed_records=r.failed_records,
            batch_size=r.batch_size,
        ))

    # Recent flow runs
    flow_runs_q = select(FlowRun).order_by(FlowRun.started_at.desc()).limit(5)
    flow_runs_result = await session.execute(flow_runs_q)
    recent_flow_runs = []
    for fr in flow_runs_result.scalars().all():
        flow_result = await session.execute(select(Flow.name).where(Flow.id == fr.flow_id))
        flow_name = flow_result.scalar_one_or_none() or f"Flow {fr.flow_id}"
        recent_flow_runs.append({
            "id": fr.id,
            "flow_id": fr.flow_id,
            "flow_name": flow_name,
            "status": fr.status,
            "total_steps": fr.total_steps,
            "completed_steps": fr.completed_steps,
            "failed_steps": fr.failed_steps,
            "started_at": fr.started_at.isoformat(),
            "completed_at": fr.completed_at.isoformat() if fr.completed_at else None,
        })

    return DashboardStats(
        connections=conn_count,
        pipelines=pipe_count,
        flows=flow_count,
        active_runs=active_count,
        recent_runs=recent_runs,
        recent_flow_runs=recent_flow_runs,
    )

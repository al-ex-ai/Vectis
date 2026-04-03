from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.flow import Flow
from vectis.models.flow_run import FlowRun
from vectis.schemas.common import SuccessResponse
from vectis.schemas.flows import FlowCreate, FlowResponse, FlowRunResponse, FlowUpdate


class FlowService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _get_or_404(self, flow_id: int) -> Flow:
        result = await self.session.execute(select(Flow).where(Flow.id == flow_id))
        flow = result.scalar_one_or_none()
        if not flow:
            raise HTTPException(status_code=404, detail=f"Flow {flow_id} not found")
        return flow

    async def _get_run_or_404(self, run_id: int) -> FlowRun:
        result = await self.session.execute(select(FlowRun).where(FlowRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run:
            raise HTTPException(status_code=404, detail=f"Flow run {run_id} not found")
        return run

    async def list_flows(self, project_id: int | None = None) -> list[FlowResponse]:
        stmt = select(Flow).order_by(Flow.created_at.desc())
        if project_id is not None:
            stmt = stmt.where(Flow.project_id == project_id)
        result = await self.session.execute(stmt)
        return [FlowResponse.model_validate(f) for f in result.scalars().all()]

    async def get_by_id(self, flow_id: int) -> FlowResponse:
        flow = await self._get_or_404(flow_id)
        return FlowResponse.model_validate(flow)

    async def create(self, data: FlowCreate) -> FlowResponse:
        flow = Flow(**data.model_dump())
        self.session.add(flow)
        await self.session.commit()
        await self.session.refresh(flow)
        return FlowResponse.model_validate(flow)

    async def update(self, flow_id: int, data: FlowUpdate) -> FlowResponse:
        flow = await self._get_or_404(flow_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(flow, key, value)
        await self.session.commit()
        await self.session.refresh(flow)
        return FlowResponse.model_validate(flow)

    async def delete(self, flow_id: int) -> None:
        flow = await self._get_or_404(flow_id)
        await self.session.delete(flow)
        await self.session.commit()

    async def list_runs(self, flow_id: int) -> list[FlowRunResponse]:
        result = await self.session.execute(
            select(FlowRun)
            .where(FlowRun.flow_id == flow_id)
            .order_by(FlowRun.started_at.desc())
        )
        return [FlowRunResponse.model_validate(r) for r in result.scalars().all()]

    async def get_run(self, run_id: int) -> FlowRunResponse:
        run = await self._get_run_or_404(run_id)
        return FlowRunResponse.model_validate(run)

    async def cancel_run(self, run_id: int) -> SuccessResponse:
        run = await self._get_run_or_404(run_id)
        if run.status.startswith("running"):
            run.status = "cancelled"
            run.completed_at = datetime.now(UTC)
            run.error_message = "Cancelled by user"
            await self.session.commit()
        return SuccessResponse()

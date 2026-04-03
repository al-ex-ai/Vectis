"""Schedule service — CRUD and trigger logic for scheduled pipeline/flow runs."""

import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.flow import Flow
from vectis.models.pipeline import Pipeline
from vectis.models.schedule import Schedule
from vectis.schemas.schedules import ScheduleCreate, ScheduleResponse, ScheduleUpdate

logger = logging.getLogger(__name__)


class ScheduleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _get_or_404(self, schedule_id: int) -> Schedule:
        result = await self.session.execute(
            select(Schedule).where(Schedule.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")
        return schedule

    async def _enrich(self, schedule: Schedule) -> ScheduleResponse:
        resp = ScheduleResponse.model_validate(schedule)
        if schedule.pipeline_id:
            result = await self.session.execute(
                select(Pipeline.name).where(Pipeline.id == schedule.pipeline_id)
            )
            resp.pipeline_name = result.scalar_one_or_none()
        if schedule.flow_id:
            result = await self.session.execute(
                select(Flow.name).where(Flow.id == schedule.flow_id)
            )
            resp.flow_name = result.scalar_one_or_none()
        return resp

    async def list_all(
        self,
        project_id: int | None = None,
        target_type: str | None = None,
    ) -> list[ScheduleResponse]:
        stmt = select(Schedule).order_by(Schedule.created_at.desc())
        if project_id is not None:
            stmt = stmt.where(Schedule.project_id == project_id)
        if target_type is not None:
            stmt = stmt.where(Schedule.target_type == target_type)
        result = await self.session.execute(stmt)
        return [await self._enrich(s) for s in result.scalars().all()]

    async def get_by_id(self, schedule_id: int) -> ScheduleResponse:
        schedule = await self._get_or_404(schedule_id)
        return await self._enrich(schedule)

    async def create(self, data: ScheduleCreate) -> ScheduleResponse:
        if data.target_type not in ("pipeline", "flow"):
            raise HTTPException(status_code=400, detail="target_type must be 'pipeline' or 'flow'")
        if data.target_type == "pipeline" and not data.pipeline_id:
            raise HTTPException(status_code=400, detail="pipeline_id is required for pipeline schedules")
        if data.target_type == "flow" and not data.flow_id:
            raise HTTPException(status_code=400, detail="flow_id is required for flow schedules")

        schedule = Schedule(**data.model_dump())
        self.session.add(schedule)
        await self.session.commit()
        await self.session.refresh(schedule)
        return await self._enrich(schedule)

    async def update(self, schedule_id: int, data: ScheduleUpdate) -> ScheduleResponse:
        schedule = await self._get_or_404(schedule_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(schedule, key, value)
        await self.session.commit()
        await self.session.refresh(schedule)
        return await self._enrich(schedule)

    async def delete(self, schedule_id: int) -> None:
        schedule = await self._get_or_404(schedule_id)
        await self.session.delete(schedule)
        await self.session.commit()

    async def set_enabled(self, schedule_id: int, enabled: bool) -> ScheduleResponse:
        schedule = await self._get_or_404(schedule_id)
        schedule.enabled = enabled
        await self.session.commit()
        await self.session.refresh(schedule)
        return await self._enrich(schedule)

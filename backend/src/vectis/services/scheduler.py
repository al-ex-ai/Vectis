"""Scheduler — APScheduler integration for cron-based pipeline/flow execution."""

import asyncio
import logging
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from vectis.db.engine import async_session
from vectis.models.flow import Flow
from vectis.models.flow_run import FlowRun
from vectis.models.pipeline import Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.models.schedule import Schedule

logger = logging.getLogger(__name__)

_bg_tasks: set[asyncio.Task[None]] = set()


async def _trigger_pipeline(schedule_id: int) -> None:
    """Trigger a pipeline run from a schedule."""
    async with async_session() as session:
        schedule = (
            await session.execute(select(Schedule).where(Schedule.id == schedule_id))
        ).scalar_one_or_none()
        if not schedule or not schedule.enabled or not schedule.pipeline_id:
            return

        # Overlap check: skip if a run is already in progress
        if schedule.overlap_policy == "skip":
            running = (
                await session.execute(
                    select(PipelineRun)
                    .where(
                        PipelineRun.pipeline_id == schedule.pipeline_id,
                        PipelineRun.status == "running",
                    )
                )
            ).scalar_one_or_none()
            if running:
                logger.info("Schedule %d: skipping, pipeline %d already running", schedule_id, schedule.pipeline_id)
                return

        pipeline = (
            await session.execute(select(Pipeline).where(Pipeline.id == schedule.pipeline_id))
        ).scalar_one_or_none()
        if not pipeline:
            logger.warning("Schedule %d: pipeline %d not found", schedule_id, schedule.pipeline_id)
            return

        from vectis.services.pipeline_service import start_run

        result = await start_run(pipeline, session)
        success = bool(result.get("success"))

        # Update schedule stats
        schedule.last_run_at = datetime.now(UTC)
        schedule.last_status = "completed" if success else "failed"
        schedule.run_count += 1
        await session.commit()

        logger.info(
            "Schedule %d: triggered pipeline %d, run_id=%s",
            schedule_id, schedule.pipeline_id, result.get("run_id"),
        )


async def _trigger_flow(schedule_id: int) -> None:
    """Trigger a flow run from a schedule."""
    async with async_session() as session:
        schedule = (
            await session.execute(select(Schedule).where(Schedule.id == schedule_id))
        ).scalar_one_or_none()
        if not schedule or not schedule.enabled or not schedule.flow_id:
            return

        # Overlap check
        if schedule.overlap_policy == "skip":
            running = (
                await session.execute(
                    select(FlowRun)
                    .where(FlowRun.flow_id == schedule.flow_id, FlowRun.status == "running")
                )
            ).scalar_one_or_none()
            if running:
                logger.info("Schedule %d: skipping, flow %d already running", schedule_id, schedule.flow_id)
                return

        flow = (
            await session.execute(select(Flow).where(Flow.id == schedule.flow_id))
        ).scalar_one_or_none()
        if not flow:
            logger.warning("Schedule %d: flow %d not found", schedule_id, schedule.flow_id)
            return

        from vectis.services.flow_engine import run_flow as execute_flow

        flow_run = FlowRun(
            flow_id=flow.id,
            status="running",
            started_at=datetime.now(UTC),
            started_by="scheduler",
        )
        session.add(flow_run)
        await session.commit()
        await session.refresh(flow_run)

        flow_data = {"steps": flow.steps}
        task = asyncio.create_task(execute_flow(flow_run.id, flow_data, async_session))
        _bg_tasks.add(task)
        task.add_done_callback(_bg_tasks.discard)

        # Update schedule stats
        schedule.last_run_at = datetime.now(UTC)
        schedule.last_status = "running"
        schedule.run_count += 1
        await session.commit()

        logger.info("Schedule %d: triggered flow %d, flow_run_id=%d", schedule_id, schedule.flow_id, flow_run.id)


class Scheduler:
    """Manages APScheduler lifecycle and job registration."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler()

    def _job_id(self, schedule_id: int) -> str:
        return f"schedule_{schedule_id}"

    def _register_job(self, schedule: Schedule) -> None:
        """Register a single schedule as an APScheduler cron job."""
        job_id = self._job_id(schedule.id)
        trigger = CronTrigger.from_crontab(schedule.cron_expression, timezone=schedule.timezone)

        func = _trigger_pipeline if schedule.target_type == "pipeline" else _trigger_flow

        self._scheduler.add_job(
            func,
            trigger=trigger,
            id=job_id,
            args=[schedule.id],
            replace_existing=True,
            misfire_grace_time=60,
        )

    async def start(self) -> None:
        """Load all enabled schedules from DB and start the scheduler."""
        async with async_session() as session:
            result = await session.execute(
                select(Schedule).where(Schedule.enabled.is_(True))
            )
            schedules = result.scalars().all()
            for s in schedules:
                try:
                    self._register_job(s)
                    logger.info("Registered schedule %d: %s (%s)", s.id, s.name, s.cron_expression)
                except Exception:
                    logger.exception("Failed to register schedule %d", s.id)

        self._scheduler.start()
        logger.info("Scheduler started with %d jobs", len(self._scheduler.get_jobs()))

    async def shutdown(self) -> None:
        """Gracefully shut down the scheduler."""
        self._scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")

    def add_or_update(self, schedule: Schedule) -> None:
        """Add or update a job dynamically (call after create/update)."""
        if schedule.enabled:
            self._register_job(schedule)
        else:
            self.remove(schedule.id)

    def remove(self, schedule_id: int) -> None:
        """Remove a job if it exists."""
        job_id = self._job_id(schedule_id)
        if self._scheduler.get_job(job_id):
            self._scheduler.remove_job(job_id)


# Global singleton — initialized in app lifespan
scheduler: Scheduler | None = None

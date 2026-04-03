from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.pipeline import Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.models.transfer_log import TransferLog
from vectis.schemas.runs import (
    RunDetailItem,
    RunDetailResponse,
    RunListItem,
    RunListResponse,
    TransferLogEntry,
)


class RunService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _get_or_404(self, run_id: int) -> PipelineRun:
        result = await self.session.execute(
            select(PipelineRun).where(PipelineRun.id == run_id)
        )
        run = result.scalar_one_or_none()
        if not run:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
        return run

    async def _pipeline_name(self, pipeline_id: int) -> str:
        result = await self.session.execute(
            select(Pipeline.name).where(Pipeline.id == pipeline_id)
        )
        return result.scalar_one_or_none() or f"Pipeline {pipeline_id}"

    async def list_runs(
        self,
        project_id: int | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> RunListResponse:
        base = select(PipelineRun)
        count_q = select(func.count(PipelineRun.id))

        if project_id is not None:
            pipe_ids = select(Pipeline.id).where(Pipeline.project_id == project_id)
            base = base.where(PipelineRun.pipeline_id.in_(pipe_ids))
            count_q = count_q.where(PipelineRun.pipeline_id.in_(pipe_ids))

        total = (await self.session.execute(count_q)).scalar_one()
        total_pages = max(1, (total + page_size - 1) // page_size)

        stmt = (
            base.order_by(PipelineRun.started_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(stmt)
        runs = []
        for r in result.scalars().all():
            pipe_name = await self._pipeline_name(r.pipeline_id)
            runs.append(RunListItem(
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
                error_message=r.error_message,
            ))

        return RunListResponse(
            runs=runs, page=page, page_size=page_size,
            total=total, total_pages=total_pages,
        )

    async def get_run(self, run_id: int) -> RunDetailResponse:
        r = await self._get_or_404(run_id)
        pipe_result = await self.session.execute(
            select(Pipeline).where(Pipeline.id == r.pipeline_id)
        )
        pipeline = pipe_result.scalar_one_or_none()
        pipe_name = pipeline.name if pipeline else f"Pipeline {r.pipeline_id}"
        dest_conn_id = pipeline.dest_connection_id if pipeline else None

        log_result = await self.session.execute(
            select(TransferLog).where(TransferLog.run_id == run_id).order_by(TransferLog.id)
        )
        logs = [TransferLogEntry.model_validate(log) for log in log_result.scalars().all()]

        return RunDetailResponse(
            run=RunDetailItem(
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
                error_message=r.error_message,
                dest_connection_id=dest_conn_id,
            ),
            logs=logs,
        )

    async def cancel_run(self, run_id: int) -> None:
        run = await self._get_or_404(run_id)
        if run.status.startswith("running"):
            run.status = "cancelled"
            run.completed_at = datetime.now(UTC)
            run.error_message = "Cancelled by user"
            await self.session.commit()

    async def resume_run(self, run_id: int) -> RunListItem:
        old_run = await self._get_or_404(run_id)

        new_run = PipelineRun(
            pipeline_id=old_run.pipeline_id,
            status="running",
            started_at=datetime.now(UTC),
            total_records=old_run.total_records,
            processed_records=old_run.processed_records,
            batch_size=old_run.batch_size,
            started_by="vectis",
        )
        self.session.add(new_run)
        await self.session.commit()
        await self.session.refresh(new_run)

        pipe_name = await self._pipeline_name(new_run.pipeline_id)

        return RunListItem(
            id=new_run.id,
            pipeline_id=new_run.pipeline_id,
            pipeline_name=pipe_name,
            status=new_run.status,
            started_at=new_run.started_at,
        )

    async def delete_run(self, run_id: int) -> None:
        run = await self._get_or_404(run_id)
        await self.session.delete(run)
        await self.session.commit()

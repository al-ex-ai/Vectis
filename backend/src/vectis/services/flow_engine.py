"""
Flow Engine — executes pipelines in dependency order with parallel execution.

Steps with no dependencies (or whose dependencies are complete) run concurrently.
Updates step_results in real-time so the UI can poll and show per-pipeline status.
"""

import asyncio
import json
import logging
import traceback
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from vectis.models.connection import Connection
from vectis.models.flow_run import FlowRun
from vectis.models.pipeline import EntityMapping, Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.plugins.registry import registry
from vectis.services.etl_engine import run_pipeline_async
from vectis.services.etl_fk import replicate_foreign_keys
from vectis.services.etl_schema import _schema_from_table

type SessionFactory = async_sessionmaker[AsyncSession]

logger = logging.getLogger(__name__)


async def _create_flow_fks(pipeline_ids: list[int], get_session: SessionFactory) -> None:
    """Create FKs across all completed pipelines in a flow."""
    async with get_session() as session:
        all_mappings: list[dict[str, Any]] = []
        dest_conn_id: int | None = None
        src_conn_id: int | None = None

        for pid in pipeline_ids:
            pipeline = (await session.execute(
                select(Pipeline).where(Pipeline.id == pid)
            )).scalar_one()
            if not dest_conn_id:
                dest_conn_id = pipeline.dest_connection_id
                src_conn_id = pipeline.source_connection_id
            mr = await session.execute(
                select(EntityMapping).where(EntityMapping.pipeline_id == pid).order_by(EntityMapping.sort_order)
            )
            for m in mr.scalars().all():
                all_mappings.append({
                    "id": m.id, "pipeline_id": m.pipeline_id,
                    "source_entity": m.source_entity, "dest_table": m.dest_table,
                    "mapping_config": m.mapping_config,
                })

        if not all_mappings or not dest_conn_id or not src_conn_id:
            return

        dst_conn = (await session.execute(
            select(Connection).where(Connection.id == dest_conn_id)
        )).scalar_one()
        src_conn = (await session.execute(
            select(Connection).where(Connection.id == src_conn_id)
        )).scalar_one()

    # Resolve dest_schema from first mapping's dest_table
    first_dest = all_mappings[0]["dest_table"]
    dest_schema = _schema_from_table(first_dest, "public")

    dest_cls = registry.get_provider(dst_conn.type)
    src_cls = registry.get_connector(src_conn.type)
    if not dest_cls or not src_cls:
        return

    dest_plugin = dest_cls(dst_conn.config)
    src_plugin = src_cls(src_conn.config)
    await dest_plugin.connect()
    try:
        await replicate_foreign_keys(dest_plugin, src_plugin, all_mappings, dest_schema)
    finally:
        await dest_plugin.disconnect()


async def run_flow(flow_run_id: int, flow: dict[str, Any], get_session: SessionFactory) -> None:
    """Execute all pipeline steps in a flow respecting dependency order."""
    steps = flow.get("steps", [])
    if not steps:
        await _finish_flow_run(flow_run_id, "completed", get_session)
        return

    step_map: dict[int, dict[str, Any]] = {}
    for step in steps:
        pid = step.get("pipeline_id")
        if pid:
            step_map[pid] = step

    total_steps = len(step_map)
    completed: set[int] = set()
    failed: set[int] = set()
    step_results: dict[str, dict[str, Any]] = {}

    # Initialize all steps as pending
    for pid in step_map:
        step_results[str(pid)] = {"pipeline_id": pid, "status": "pending"}

    await _update_flow_run(flow_run_id, get_session,
                           status="running", total_steps=total_steps,
                           step_results=step_results)

    try:
        while len(completed) + len(failed) < len(step_map):
            ready = []
            for pid, step in step_map.items():
                if pid in completed or pid in failed:
                    continue
                deps = set(step.get("depends_on", []))
                if deps <= completed:
                    ready.append(pid)
                elif deps & failed:
                    failed.add(pid)
                    step_results[str(pid)] = {
                        "pipeline_id": pid, "status": "skipped",
                        "error": "Dependency failed",
                    }

            if not ready:
                break

            # Mark ready steps as running
            for pid in ready:
                step_results[str(pid)] = {"pipeline_id": pid, "status": "running"}
            await _update_flow_run(flow_run_id, get_session,
                                   step_results=step_results)

            results = await asyncio.gather(
                *[_run_pipeline_step(pid, get_session) for pid in ready],
                return_exceptions=True,
            )

            for pid, result in zip(ready, results, strict=True):
                if isinstance(result, Exception):
                    failed.add(pid)
                    step_results[str(pid)] = {
                        "pipeline_id": pid, "status": "failed",
                        "error": str(result)[:300],
                    }
                else:
                    completed.add(pid)
                    step_results[str(pid)] = {
                        "pipeline_id": pid, "status": "completed",
                        "run_id": result.get("run_id"),
                    }

            await _update_flow_run(flow_run_id, get_session,
                                   completed_steps=len(completed),
                                   failed_steps=len(failed),
                                   step_results=step_results)

        # Create FKs after all pipelines complete
        if completed:
            try:
                await _create_flow_fks(list(completed), get_session)
            except Exception as fk_err:
                logger.info(f"[Flow] FK creation failed (non-critical): {fk_err}")

        status = "completed" if not failed else "completed_with_errors"
        error_msg = f"Failed pipelines: {sorted(failed)}" if failed else None
        await _finish_flow_run(flow_run_id, status, get_session,
                               completed_steps=len(completed),
                               failed_steps=len(failed),
                               step_results=step_results,
                               error_message=error_msg)

    except Exception as e:
        await _finish_flow_run(
            flow_run_id, "failed", get_session,
            step_results=step_results,
            error_message=f"{e}\n{traceback.format_exc()[:500]}",
        )


async def _run_pipeline_step(
    pipeline_id: int, get_session: SessionFactory,
) -> dict[str, Any]:
    """Run a single pipeline and return stats."""
    async with get_session() as session:
        pipeline = (await session.execute(
            select(Pipeline).where(Pipeline.id == pipeline_id)
        )).scalar_one()
        src_conn = (await session.execute(
            select(Connection).where(Connection.id == pipeline.source_connection_id)
        )).scalar_one()
        dst_conn = (await session.execute(
            select(Connection).where(Connection.id == pipeline.dest_connection_id)
        )).scalar_one()
        mr = await session.execute(
            select(EntityMapping)
            .where(EntityMapping.pipeline_id == pipeline_id)
            .order_by(EntityMapping.sort_order)
        )
        mappings = [
            {"id": m.id, "pipeline_id": m.pipeline_id,
             "source_entity": m.source_entity, "dest_table": m.dest_table,
             "mapping_config": m.mapping_config,
             "transform_type": m.transform_type, "sort_order": m.sort_order}
            for m in mr.scalars().all()
        ]

    if not mappings:
        return {"run_id": None, "total": 0, "processed": 0, "failed": 0}

    source_cls = registry.get_connector(src_conn.type)
    dest_cls = registry.get_provider(dst_conn.type)
    if not source_cls or not dest_cls:
        raise RuntimeError(f"No plugin for {src_conn.type}/{dst_conn.type}")

    source_plugin = source_cls(src_conn.config)
    dest_plugin = dest_cls(dst_conn.config)

    raw_settings = pipeline.settings
    try:
        settings = json.loads(raw_settings) if isinstance(raw_settings, str) else (raw_settings or {})
    except (json.JSONDecodeError, TypeError):
        settings = {}
    if not isinstance(settings, dict):
        settings = {}
    batch_size = settings.get("batch_size", 1000)
    dest_schema = settings.get("dest_schema", "dbo") or "dbo"

    async with get_session() as session:
        run = PipelineRun(
            pipeline_id=pipeline_id, status="running",
            started_at=datetime.now(UTC), batch_size=batch_size,
            started_by="vectis-flow",
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        run_id = run.id

    async def _update_run(
        rid: int, status: str, total: int, processed: int, failed: int,
        error: str | None = None,
    ) -> None:
        async with get_session() as sess:
            r = (await sess.execute(
                select(PipelineRun).where(PipelineRun.id == rid)
            )).scalar_one()
            r.status = status
            r.total_records = total
            r.processed_records = processed
            r.failed_records = failed
            r.completed_at = datetime.now(UTC)
            if error:
                r.error_message = error
            await sess.commit()

    async def _write_log(
        rid: int, mapping_id: int, source_entity: str, dest_table: str,
        source_id: str, status: str, batch_number: int, error_detail: str | None,
    ) -> None:
        from vectis.models.transfer_log import TransferLog
        async with get_session() as sess:
            sess.add(TransferLog(
                run_id=rid, entity_mapping_id=mapping_id,
                source_entity=source_entity, dest_table=dest_table,
                source_id=source_id, status=status,
                batch_number=batch_number, error_detail=error_detail,
            ))
            await sess.commit()

    await run_pipeline_async(
        run_id=run_id, source=source_plugin, dest=dest_plugin,
        mappings=mappings, source_type=src_conn.type,
        batch_size=batch_size, dest_schema=dest_schema,
        pipeline_settings=settings,
        update_run_fn=_update_run, log_fn=_write_log,
    )

    async with get_session() as session:
        final = (await session.execute(
            select(PipelineRun).where(PipelineRun.id == run_id)
        )).scalar_one()
        if final.status == "failed":
            raise RuntimeError(final.error_message or "Pipeline failed")
        return {"run_id": run_id, "total": final.total_records,
                "processed": final.processed_records, "failed": final.failed_records}


async def _update_flow_run(
    flow_run_id: int, get_session: SessionFactory, **kwargs: Any,
) -> None:
    async with get_session() as session:
        run = (await session.execute(
            select(FlowRun).where(FlowRun.id == flow_run_id)
        )).scalar_one()
        for k, v in kwargs.items():
            setattr(run, k, v)
        await session.commit()


async def _finish_flow_run(
    flow_run_id: int, status: str, get_session: SessionFactory, **kwargs: Any,
) -> None:
    async with get_session() as session:
        run = (await session.execute(
            select(FlowRun).where(FlowRun.id == flow_run_id)
        )).scalar_one()
        run.status = status
        run.completed_at = datetime.now(UTC)
        for k, v in kwargs.items():
            setattr(run, k, v)
        await session.commit()

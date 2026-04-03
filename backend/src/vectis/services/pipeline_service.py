"""Pipeline service — run, validate, discover, and settings logic."""

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.connection import Connection
from vectis.models.pipeline import EntityMapping, Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.models.transfer_log import TransferLog
from vectis.plugins.registry import registry
from vectis.services.etl_engine import run_pipeline_async

logger = logging.getLogger(__name__)

_bg_tasks: set[asyncio.Task[None]] = set()


async def _get_connection(session: AsyncSession, conn_id: int) -> Connection | None:
    result = await session.execute(select(Connection).where(Connection.id == conn_id))
    return result.scalar_one_or_none()


def _parse_settings(pipeline: Pipeline) -> dict[str, Any]:
    raw = pipeline.settings
    try:
        settings = json.loads(raw) if isinstance(raw, str) else (raw or {})
    except (json.JSONDecodeError, TypeError):
        settings = {}
    return settings if isinstance(settings, dict) else {}


def _serialize_mappings(mappings: list[EntityMapping]) -> list[dict[str, Any]]:
    return [
        {
            "id": m.id, "pipeline_id": m.pipeline_id,
            "source_entity": m.source_entity, "dest_table": m.dest_table,
            "mapping_config": m.mapping_config, "transform_type": m.transform_type,
            "sort_order": m.sort_order,
        }
        for m in mappings
    ]


# ── Run ──────────────────────────────────────────────────────────────

async def start_run(
    pipeline: Pipeline, session: AsyncSession,
) -> dict[str, object]:
    """Resolve plugins, create run record, kick off ETL in background."""
    src_conn = await _get_connection(session, pipeline.source_connection_id)
    dst_conn = await _get_connection(session, pipeline.dest_connection_id)
    if not src_conn or not dst_conn:
        return {"success": False, "error": "Source or destination connection not found"}

    mr = await session.execute(
        select(EntityMapping)
        .where(EntityMapping.pipeline_id == pipeline.id)
        .order_by(EntityMapping.sort_order)
    )
    mappings = _serialize_mappings(list(mr.scalars().all()))
    if not mappings:
        return {"success": False, "error": "No entity mappings configured"}

    source_cls = registry.get_connector(src_conn.type)
    dest_cls = registry.get_provider(dst_conn.type)
    if not source_cls:
        return {"success": False, "error": f"No connector plugin for type '{src_conn.type}'"}
    if not dest_cls:
        return {"success": False, "error": f"No provider plugin for type '{dst_conn.type}'"}

    settings = _parse_settings(pipeline)
    batch_size = settings.get("batch_size", 1000)
    dest_schema = settings.get("dest_schema", "dbo") or "dbo"

    run = PipelineRun(
        pipeline_id=pipeline.id, status="running",
        started_at=datetime.now(UTC), batch_size=batch_size,
        started_by="vectis",
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)

    source_plugin = source_cls(src_conn.config)
    dest_plugin = dest_cls(dst_conn.config)

    task = asyncio.create_task(
        run_pipeline_async(
            run_id=run.id, source=source_plugin, dest=dest_plugin,
            mappings=mappings, source_type=src_conn.type,
            batch_size=batch_size, dest_schema=dest_schema,
            pipeline_settings=settings,
            update_run_fn=_update_run, log_fn=_write_log,
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    return {"success": True, "run_id": run.id}


async def _update_run(
    run_id: int, status: str, total: int, processed: int, failed: int,
    error: str | None = None,
) -> None:
    from vectis.db.engine import async_session

    async with async_session() as sess:
        r = (await sess.execute(select(PipelineRun).where(PipelineRun.id == run_id))).scalar_one()
        r.status = status
        r.total_records = total
        r.processed_records = processed
        r.failed_records = failed
        r.completed_at = datetime.now(UTC)
        if error:
            r.error_message = error
        await sess.commit()


async def _write_log(
    run_id: int, mapping_id: int, source_entity: str, dest_table: str,
    source_id: str, status: str, batch_number: int, error_detail: str | None,
) -> None:
    from vectis.db.engine import async_session

    async with async_session() as sess:
        sess.add(TransferLog(
            run_id=run_id, entity_mapping_id=mapping_id,
            source_entity=source_entity, dest_table=dest_table,
            source_id=source_id, status=status,
            batch_number=batch_number, error_detail=error_detail,
        ))
        await sess.commit()


# ── Validate ─────────────────────────────────────────────────────────

async def validate(
    pipeline: Pipeline, session: AsyncSession,
) -> dict[str, object]:
    """Validate pipeline configuration before running."""
    mr = await session.execute(
        select(EntityMapping).where(EntityMapping.pipeline_id == pipeline.id)
    )
    mappings = list(mr.scalars().all())

    src = await _get_connection(session, pipeline.source_connection_id)
    dst = await _get_connection(session, pipeline.dest_connection_id)

    checks: list[dict[str, object]] = [
        {"status": "pass", "message": f"Source connection '{src.name}' exists"} if src
        else {"status": "fail", "message": "Source connection not found"},
        {"status": "pass", "message": f"Destination connection '{dst.name}' exists"} if dst
        else {"status": "fail", "message": "Destination connection not found"},
    ]

    if not mappings:
        checks.append({"status": "fail", "message": "No entity mappings configured"})
    else:
        checks.append({"status": "pass", "message": f"{len(mappings)} entity mapping(s) configured"})

    mapping_checks = []
    for m in mappings:
        try:
            cfg = json.loads(m.mapping_config or "{}")
        except json.JSONDecodeError:
            cfg = {}

        step_checks = []
        if not m.source_entity:
            step_checks.append({"check": "source_entity", "status": "fail", "message": "Source entity is empty"})
        else:
            step_checks.append({"check": "source_entity", "status": "pass", "message": f"Source entity: {m.source_entity}"})
        if not m.dest_table:
            step_checks.append({"check": "dest_table", "status": "fail", "message": "Destination table is empty"})
        else:
            step_checks.append({"check": "dest_table", "status": "pass", "message": f"Destination table: {m.dest_table}"})

        cols = cfg.get("columns", {})
        if cols:
            step_checks.append({"check": "columns", "status": "pass", "message": f"{len(cols)} column(s) mapped"})
        else:
            step_checks.append({"check": "columns", "status": "warn", "message": "No column mappings \u2014 all fields will be included"})

        strategy = cfg.get("load_strategy", "append")
        step_checks.append({"check": "strategy", "status": "pass", "message": f"Load strategy: {strategy}"})

        has_fail = any(c["status"] == "fail" for c in step_checks)
        has_warn = any(c["status"] == "warn" for c in step_checks)
        mapping_checks.append({
            "source_entity": m.source_entity, "dest_table": m.dest_table,
            "load_strategy": strategy,
            "status": "fail" if has_fail else "warn" if has_warn else "pass",
            "checks": step_checks,
        })

    all_checks = checks + [{"status": mc["status"], "message": f"{mc['source_entity']}: {mc['status']}"} for mc in mapping_checks]

    return {
        "valid": not any(c["status"] == "fail" for c in all_checks),
        "pipeline": pipeline.name,
        "source_connection": checks[0],
        "dest_connection": checks[1],
        "mappings": mapping_checks,
        "summary": {
            "pass": sum(1 for c in all_checks if c["status"] == "pass"),
            "warn": sum(1 for c in all_checks if c["status"] == "warn"),
            "fail": sum(1 for c in all_checks if c["status"] == "fail"),
        },
    }


# ── Discover ─────────────────────────────────────────────────────────

async def discover_entities(
    pipeline: Pipeline, side: str, session: AsyncSession,
) -> dict[str, object]:
    """Discover entities/tables using the connector (source) or provider (dest)."""
    conn_id = pipeline.source_connection_id if side == "source" else pipeline.dest_connection_id
    connection = await _get_connection(session, conn_id)
    if not connection:
        return {"success": False, "error": f"Connection {conn_id} not found"}

    # Both source and dest: try connector first, then provider
    connector_cls = registry.get_connector(connection.type)
    if connector_cls:
        connector = connector_cls(connection.config)
        try:
            entities = await connector.discover_entities()
            return {
                "entities": [
                    {
                        "name": e.name, "display_name": e.display_name,
                        "entity_set_name": e.entity_set_name,
                        "primary_id": e.primary_id,
                        "is_custom": e.is_custom, "is_intersect": e.is_intersect,
                    }
                    for e in entities
                ],
                "source_type": connection.type,
            }
        except Exception as exc:
            return {"error": str(exc), "entities": [], "source_type": connection.type}

    return {"entities": [], "source_type": connection.type}


async def discover_attributes(
    pipeline: Pipeline, entity_name: str, session: AsyncSession,
) -> dict[str, object]:
    """Discover attributes for a specific entity using the connector."""
    connection = await _get_connection(session, pipeline.source_connection_id)
    if not connection:
        return {"success": False, "error": "Source connection not found"}

    connector_cls = registry.get_connector(connection.type)
    if connector_cls:
        connector = connector_cls(connection.config)
        try:
            attributes = await connector.discover_attributes(entity_name)
            return {
                "attributes": [
                    {
                        "name": a.name, "display_name": a.display_name,
                        "type": a.type, "required": a.required,
                        "nullable": a.nullable, "max_length": a.max_length,
                        "is_primary_id": a.is_primary_id,
                    }
                    for a in attributes
                ],
                "relations": [],
            }
        except Exception as exc:
            return {"error": str(exc), "attributes": [], "relations": []}

    return {"attributes": [], "relations": []}

"""
Vectis ETL Engine — orchestrator for pipeline execution.

Routes all data operations through SourceConnector and DBProvider plugin interfaces.
Handles: progress tracking, dependency sorting, run/resume, FK management.
"""

import json
import logging
import traceback
from collections.abc import Awaitable, Callable
from typing import Any, Protocol

from vectis.plugins.connectors.base import SourceConnector
from vectis.plugins.providers.base import DBProvider
from vectis.services.etl_fk import add_foreign_keys, replicate_foreign_keys
from vectis.services.etl_processor import RunCancelledError, process_crm_entity, process_sql_entity
from vectis.services.etl_transforms import parse_mapping_config

logger = logging.getLogger(__name__)


class UpdateRunFn(Protocol):
    def __call__(
        self, run_id: int, status: str, total: int, processed: int, failed: int,
        *, error: str | None = ...,
    ) -> Awaitable[None]: ...


LogFn = Callable[[int, int, str, str, str, str, int, str | None], Awaitable[None]]

# ── In-memory progress tracking ────────────────────────────────────
# Zero DB polling during pipeline execution. The /runs/{id}/status
# endpoint reads from memory for live runs.

_run_progress: dict[int, dict[str, Any]] = {}


def progress_update(run_id: int, **kwargs: Any) -> None:
    if run_id not in _run_progress:
        _run_progress[run_id] = {
            "status": "running", "processed": 0, "total": 0,
            "failed": 0, "cancelled": False,
        }
    _run_progress[run_id].update(kwargs)


def progress_get(run_id: int) -> dict[str, Any] | None:
    return _run_progress.get(run_id)


def progress_cancel(run_id: int) -> None:
    if run_id in _run_progress:
        _run_progress[run_id]["cancelled"] = True
    else:
        _run_progress[run_id] = {
            "status": "cancelled", "processed": 0, "total": 0,
            "failed": 0, "cancelled": True,
        }


def progress_cleanup(run_id: int) -> None:
    _run_progress.pop(run_id, None)


def _check_cancelled(run_id: int) -> None:
    p = _run_progress.get(run_id)
    if p and p.get("cancelled"):
        raise RunCancelledError("Run cancelled by user")


# ── Dependency sorting (Kahn's algorithm) ──────────────────────────

def resolve_dependency_order(
    mappings: list[dict[str, Any]],
    source: SourceConnector | None = None,
    source_type: str = "",
) -> list[dict[str, Any]]:
    """Sort mappings so parent entities are processed before children.

    Uses explicit sort_order if set, otherwise builds a dependency graph from:
    - depends_on in mapping config (intersect entities)
    - relations in mapping config (SQL FK discovery)
    """
    if len(mappings) <= 1:
        return mappings

    orders = [m.get("sort_order", 0) for m in mappings]
    if len(set(orders)) > 1:
        return sorted(mappings, key=lambda m: m.get("sort_order", 0))

    entity_names = {m["source_entity"] for m in mappings}
    deps: dict[str, set[str]] = {m["source_entity"]: set() for m in mappings}

    for m in mappings:
        cfg = parse_mapping_config(m)
        # Explicit depends_on (intersect entities and manual deps)
        for parent in cfg.get("depends_on", []):
            if parent in entity_names and parent != m["source_entity"]:
                deps[m["source_entity"]].add(parent)
        # Relations from SQL FK discovery
        for rel in cfg.get("relations", []):
            parent = rel.get("to_table", "")
            if parent in entity_names and parent != m["source_entity"]:
                deps[m["source_entity"]].add(parent)

    # Kahn's algorithm
    entity_to_mapping = {m["source_entity"]: m for m in mappings}
    in_degree = {e: len(d) for e, d in deps.items()}
    queue = [e for e, d in in_degree.items() if d == 0]
    sorted_entities: list[str] = []

    while queue:
        entity = queue.pop(0)
        sorted_entities.append(entity)
        for child, parents in deps.items():
            if entity in parents:
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

    # Add remaining (circular deps) in original order
    for m in mappings:
        if m["source_entity"] not in sorted_entities:
            sorted_entities.append(m["source_entity"])

    return [entity_to_mapping[e] for e in sorted_entities if e in entity_to_mapping]


# ── Pipeline execution ─────────────────────────────────────────────

async def execute_pipeline(
    run_id: int,
    source: SourceConnector,
    dest: DBProvider,
    mappings: list[dict[str, Any]],
    source_type: str = "",
    batch_size: int = 1000,
    dest_schema: str = "dbo",
    pipeline_settings: dict[str, Any] | None = None,
    on_log: LogFn | None = None,
    skip_batches: dict[int, int] | None = None,
) -> tuple[int, int, int]:
    """Execute ETL for all entity mappings in a pipeline.

    Returns (total_records, processed_records, failed_records).
    """
    await dest.connect()
    total_records = 0
    processed_records = 0
    failed_records = 0

    try:
        sorted_mappings = resolve_dependency_order(mappings, source, source_type)
        is_sql_source = source.source_category == "sql"

        for mapping in sorted_mappings:
            _check_cancelled(run_id)

            cfg = parse_mapping_config(mapping)
            source_entity = mapping["source_entity"]
            dest_table = mapping["dest_table"]
            # Extract schema from dest_table if it contains a dot (e.g. "warehouse.accounts")
            if "." in dest_table and not cfg.get("dest_schema"):
                effective_schema = dest_table.rsplit(".", 1)[0]
            else:
                effective_schema = cfg.get("dest_schema") or dest_schema
            entity_skip = (skip_batches or {}).get(mapping.get("id", 0), 0)

            progress_update(run_id, status=f"running: {source_entity}")

            try:
                # Process entity based on source type
                if is_sql_source:
                    stats = await process_sql_entity(
                        run_id=run_id, mapping=mapping, cfg=cfg,
                        source=source, dest=dest,
                        batch_size=batch_size, dest_schema=effective_schema,
                        skip_batches=entity_skip,
                        check_cancelled=_check_cancelled,
                        on_progress=lambda rid, **kw: progress_update(rid, **kw),
                    )
                else:
                    stats = await process_crm_entity(
                        run_id=run_id, mapping=mapping, cfg=cfg,
                        source=source, dest=dest,
                        batch_size=batch_size, dest_schema=effective_schema,
                        skip_batches=entity_skip,
                        check_cancelled=_check_cancelled,
                        on_progress=lambda rid, **kw: progress_update(rid, **kw),
                    )

                entity_processed = stats.get("inserted", 0) + stats.get("updated", 0)
                total_records += entity_processed + stats.get("failed", 0)
                processed_records += entity_processed
                failed_records += stats.get("failed", 0)
                progress_update(run_id, total=total_records, processed=processed_records, failed=failed_records)

                qualified_dest = dest_table if "." in dest_table else f"{effective_schema}.{dest_table}"
                logger.info(f"[ETL] {source_entity} -> {qualified_dest}: {entity_processed} records")

                if on_log:
                    await on_log(
                        run_id, mapping.get("id", 0), source_entity, qualified_dest,
                        f"total_{entity_processed}_records", "transferred", 1, None,
                    )

            except RunCancelledError:
                raise
            except Exception as e:
                error_str = str(e)
                qualified_dest = dest_table if "." in dest_table else f"{effective_schema}.{dest_table}"
                logger.info(f"[ETL] Error processing {source_entity}: {error_str}")
                failed_records += 1
                progress_update(run_id, failed=failed_records)
                if on_log:
                    await on_log(
                        run_id, mapping.get("id", 0), source_entity, qualified_dest,
                        "error", "failed", 0, error_str[:500],
                    )

        # FK creation — respect pipeline settings
        ps = pipeline_settings or {}
        track_fks = ps.get("track_fks", True)
        enforce_fks = ps.get("enforce_fks", True)

        if track_fks and enforce_fks:
            try:
                if is_sql_source:
                    await replicate_foreign_keys(dest, source, sorted_mappings, dest_schema)
                else:
                    await add_foreign_keys(dest, sorted_mappings, dest_schema)
            except Exception as e:
                logger.info(f"[ETL] FK creation failed (non-critical): {e}")

    finally:
        await dest.disconnect()

    return total_records, processed_records, failed_records


# ── Run orchestrator (called from route) ───────────────────────────

async def run_pipeline_async(
    run_id: int,
    source: SourceConnector,
    dest: DBProvider,
    mappings: list[dict[str, Any]],
    source_type: str = "",
    batch_size: int = 1000,
    dest_schema: str = "dbo",
    pipeline_settings: dict[str, Any] | None = None,
    update_run_fn: UpdateRunFn | None = None,
    log_fn: LogFn | None = None,
) -> None:
    """Full pipeline execution with progress tracking and status updates."""
    progress_update(run_id, status="running: initializing")

    try:
        total, processed, failed = await execute_pipeline(
            run_id=run_id, source=source, dest=dest, mappings=mappings,
            source_type=source_type, batch_size=batch_size,
            dest_schema=dest_schema, pipeline_settings=pipeline_settings,
            on_log=log_fn,
        )

        if update_run_fn:
            await update_run_fn(run_id, "completed", total, processed, failed)

    except RunCancelledError:
        if update_run_fn:
            await update_run_fn(run_id, "cancelled", 0, 0, 0, error="Cancelled by user")

    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()[:500]}"
        logger.info(f"[ETL] Pipeline run {run_id} failed: {error_msg}")
        if update_run_fn:
            await update_run_fn(run_id, "failed", 0, 0, 0, error=error_msg)

    finally:
        progress_cleanup(run_id)


async def run_pipeline_resume(
    run_id: int,
    source: SourceConnector,
    dest: DBProvider,
    mappings: list[dict[str, Any]],
    completed_mapping_ids: set[int],
    last_batches: dict[int, int],
    source_type: str = "",
    batch_size: int = 1000,
    dest_schema: str = "dbo",
    pipeline_settings: dict[str, Any] | None = None,
    update_run_fn: UpdateRunFn | None = None,
    log_fn: LogFn | None = None,
) -> None:
    """Resume a pipeline run, skipping fully completed mappings.

    Partially-completed mappings are forced to upsert to avoid duplicates.
    """
    # Build skip_batches map; force upsert for partially-completed mappings
    skip_batches: dict[int, int] = {}
    for m in mappings:
        mid = m.get("id", 0)
        if mid in completed_mapping_ids and mid in last_batches:
            skip_batches[mid] = last_batches[mid]
            cfg = parse_mapping_config(m)
            if cfg.get("load_strategy") in ("append", "replace"):
                cfg["load_strategy"] = "upsert"
                m["mapping_config"] = json.dumps(cfg)

    progress_update(run_id, status="running: resuming")

    try:
        total, processed, failed = await execute_pipeline(
            run_id=run_id, source=source, dest=dest, mappings=mappings,
            source_type=source_type, batch_size=batch_size,
            dest_schema=dest_schema, pipeline_settings=pipeline_settings,
            on_log=log_fn, skip_batches=skip_batches,
        )

        if update_run_fn:
            await update_run_fn(run_id, "completed", total, processed, failed)

    except RunCancelledError:
        if update_run_fn:
            await update_run_fn(run_id, "cancelled", 0, 0, 0, error="Cancelled by user")

    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()[:500]}"
        logger.info(f"[ETL] Pipeline run {run_id} failed: {error_msg}")
        if update_run_fn:
            await update_run_fn(run_id, "failed", 0, 0, 0, error=error_msg)

    finally:
        progress_cleanup(run_id)

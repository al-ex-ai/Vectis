"""
ETL Processor — per-entity processing for CRM and SQL sources.

Ported from DataBridge's _process_crm_entity and _process_sql_entity,
routing all operations through SourceConnector and DBProvider plugin interfaces.
"""

import logging
from collections.abc import Callable
from typing import Any

from vectis.plugins.connectors.base import SourceConnector
from vectis.plugins.providers.base import DBProvider
from vectis.services.etl_schema import (
    _bare_name,
    _safe_filter_expr,
    drop_table,
    ensure_columns_exist,
    ensure_dest_table,
)
from vectis.services.etl_transforms import (
    apply_column_map,
    build_odata_filter,
    build_sql_where,
    sanitize_record,
)

logger = logging.getLogger(__name__)


class RunCancelledError(Exception):
    pass


EntityStats = dict[str, int]


def _empty_stats() -> EntityStats:
    return {"total": 0, "inserted": 0, "updated": 0, "skipped": 0, "failed": 0}


# ── Shared flush ────────────────────────────────────────────────────

async def _flush_batch(
    dest: DBProvider, dest_table: str, batch: list[dict[str, Any]],
    load_strategy: str, primary_key: str | list[str],
    dest_schema: str, stats: EntityStats, auto_add_cols: bool = False,
) -> None:
    """Write a batch of records with single-row fallback on bulk failure."""
    if not batch:
        return
    sanitized = [sanitize_record(r) for r in batch]
    qualified = dest.qualified_table(_bare_name(dest_table), dest_schema)
    if auto_add_cols:
        await ensure_columns_exist(dest, sanitized, dest_table, dest_schema)
    try:
        if load_strategy in ("upsert", "cdc") and primary_key:
            key_cols = primary_key if isinstance(primary_key, list) else [primary_key]
            stats["inserted"] += await dest.bulk_upsert(qualified, sanitized, key_cols)
        else:
            stats["inserted"] += await dest.bulk_insert(qualified, sanitized)
    except Exception:
        for record in sanitized:
            try:
                await dest.bulk_insert(qualified, [record])
                stats["inserted"] += 1
            except Exception:
                stats["failed"] += 1


# ── CRM Entity Processing ──────────────────────────────────────────

async def process_crm_entity(
    run_id: int, mapping: dict[str, Any], cfg: dict[str, Any],
    source: SourceConnector, dest: DBProvider,
    batch_size: int, dest_schema: str = "dbo", skip_batches: int = 0,
    check_cancelled: Callable[[int], None] | None = None,
    on_progress: Callable[..., object] | None = None,
) -> EntityStats:
    """Extract from CRM entity and bulk load into destination.

    Key rules: NO $select (fetch all, map client-side), replace = DROP table,
    bulk fail -> single-row fallback.
    """
    column_map = cfg.get("columns") or cfg.get("column_map", {})
    column_aliases = cfg.get("column_aliases", {})
    static_values = cfg.get("static_values", {})
    load_strategy = cfg.get("load_strategy", "append")
    is_intersect = cfg.get("is_intersect", False)
    entity_set_name = cfg.get("entity_set_name", "")
    source_entity = mapping["source_entity"]
    dest_table = mapping["dest_table"]

    # Resolve primary key
    primary_key_dest = _resolve_primary_key(cfg, column_map, is_intersect)

    # Build OData filter (including CDC)
    user_filters = list(cfg.get("filters", []))
    if load_strategy == "cdc":
        cdc_field = cfg.get("cdc_field", "modifiedon")
        last_sync = cfg.get("last_sync_time", "")
        if last_sync:
            user_filters.append({"field": cdc_field, "operator": "ge", "value": last_sync})
    odata_filter = build_odata_filter(user_filters)

    # Lookup fields for GUID type inference
    lookup_fields = _build_lookup_fields(cfg, column_map, is_intersect)

    # Replace = DROP table
    if load_strategy == "replace" and skip_batches == 0:
        await drop_table(dest, _bare_name(dest_table), dest_schema)

    # Only discover source attributes if we need to create the table
    # (avoids expensive CRM API call when table already exists)
    source_attrs: list[dict[str, Any]] = []
    table_exists = await _table_exists(dest, dest_table, dest_schema)
    if not table_exists:
        source_attrs = await _discover_attrs(source, source_entity)
    await ensure_dest_table(
        dest, dest_table, column_map, source_attrs, primary_key_dest,
        static_values, dest_schema, lookup_fields=lookup_fields,
    )

    stats = _empty_stats()
    batch: list[dict[str, Any]] = []
    records_seen = 0
    skip_records = skip_batches * batch_size

    async for record in source.fetch_data(
        source_entity, columns=None, page_size=batch_size,
        filter_expr=odata_filter or None,
        entity_set_name=entity_set_name or None,
    ):
        if check_cancelled:
            check_cancelled(run_id)
        records_seen += 1
        stats["total"] += 1
        if records_seen <= skip_records:
            continue
        try:
            batch.append(apply_column_map(record, column_map, static_values, column_aliases))
        except Exception:
            stats["failed"] += 1
        if len(batch) >= batch_size:
            await _flush_batch(dest, dest_table, batch, load_strategy, primary_key_dest, dest_schema, stats, auto_add_cols=True)
            batch = []
            if on_progress:
                on_progress(run_id, processed=stats["inserted"] + stats["updated"])

    if batch:
        await _flush_batch(dest, dest_table, batch, load_strategy, primary_key_dest, dest_schema, stats, auto_add_cols=True)
        if on_progress:
            on_progress(run_id, processed=stats["inserted"] + stats["updated"])
    return stats


# ── SQL Entity Processing ──────────────────────────────────────────

async def process_sql_entity(
    run_id: int, mapping: dict[str, Any], cfg: dict[str, Any],
    source: SourceConnector, dest: DBProvider,
    batch_size: int, dest_schema: str = "dbo", skip_batches: int = 0,
    check_cancelled: Callable[[int], None] | None = None,
    on_progress: Callable[..., object] | None = None,
) -> EntityStats:
    """Extract from source SQL table and bulk load into destination.

    Supports source_sql (custom SQL with CTE pagination), WHERE filters,
    column mapping or schema passthrough, replace = DROP + recreate.
    """
    source_table = mapping["source_entity"]
    dest_table = mapping["dest_table"]
    column_map = cfg.get("columns") or cfg.get("column_map", {})
    static_values = cfg.get("static_values", {})
    custom_sql = cfg.get("source_sql")
    lookup_fields = set(cfg.get("lookup_fields", []))
    is_intersect = cfg.get("is_intersect", False)

    primary_key_dest = _resolve_primary_key(cfg, column_map, is_intersect)
    if is_intersect:
        for k in cfg.get("composite_keys", []):
            lookup_fields.add(k)

    load_strategy = cfg.get("load_strategy", "append")

    # CDC filter injection
    user_filters = list(cfg.get("filters", []))
    if load_strategy == "cdc":
        last_sync = cfg.get("last_sync_time", "")
        if last_sync:
            user_filters.append({"field": cfg.get("cdc_field", "ModifiedDate"), "operator": "ge", "value": last_sync})
    where_clause, filter_params = build_sql_where(user_filters) if not custom_sql else ("", {})

    if load_strategy == "replace" and skip_batches == 0:
        await drop_table(dest, _bare_name(dest_table), dest_schema)

    # Schema discovery + table creation
    source_attrs: list[dict[str, Any]] = []
    sample_row: dict[str, Any] | None = None

    if custom_sql:
        try:
            sample = await source.query(f"SELECT TOP 1 * FROM ({custom_sql}) AS _src")  # type: ignore[attr-defined]
            if sample:
                sample_row = dict(sample[0])
        except Exception:
            logger.debug("Suppressed error", exc_info=True)
        if not sample_row:
            return _empty_stats()
        await ensure_dest_table(dest, dest_table, {}, source_attrs, primary_key_dest, static_values, dest_schema, sample_row=sample_row, lookup_fields=lookup_fields or None)
    else:
        # Always discover attrs for SQL sources — needed for type inference
        source_attrs = await _discover_attrs(source, source_table)
        await ensure_dest_table(dest, dest_table, column_map, source_attrs, primary_key_dest, static_values, dest_schema, lookup_fields=lookup_fields or None)

    stats = _empty_stats()

    if custom_sql:
        await _process_custom_sql(run_id, dest, dest_table, custom_sql, primary_key_dest, static_values, load_strategy, batch_size, skip_batches, dest_schema, stats, source, check_cancelled, on_progress)
    else:
        filter_expr = ""
        if where_clause:
            wc = where_clause
            for key in filter_params:
                wc = wc.replace(f"@{key}", f"'{filter_params[key]}'")
            filter_expr = _safe_filter_expr(wc)

        batch: list[dict[str, Any]] = []
        records_seen = 0
        skip_records = skip_batches * batch_size
        use_distinct = bool(cfg.get("distinct"))
        seen_pks: set[str] = set()

        async for record in source.fetch_data(source_table, columns=list(column_map.keys()) if column_map else None, page_size=batch_size, filter_expr=filter_expr or None):
            if check_cancelled:
                check_cancelled(run_id)
            records_seen += 1
            stats["total"] += 1
            if records_seen <= skip_records:
                continue
            # Deduplicate when distinct flag is set
            if use_distinct:
                row_key = str(sorted(record.items()))
                if row_key in seen_pks:
                    continue
                seen_pks.add(row_key)
            try:
                batch.append(apply_column_map(record, column_map, static_values))
            except Exception:
                stats["failed"] += 1
            if len(batch) >= batch_size:
                await _flush_batch(dest, dest_table, batch, load_strategy, primary_key_dest, dest_schema, stats)
                batch = []
                if on_progress:
                    on_progress(run_id, processed=stats["inserted"] + stats["updated"])
        if batch:
            await _flush_batch(dest, dest_table, batch, load_strategy, primary_key_dest, dest_schema, stats)
            if on_progress:
                on_progress(run_id, processed=stats["inserted"] + stats["updated"])
    return stats


# ── Custom SQL processing ──────────────────────────────────────────

async def _process_custom_sql(
    run_id: int, dest: DBProvider, dest_table: str, custom_sql: str,
    primary_key: str | list[str], static_values: dict[str, Any],
    load_strategy: str, batch_size: int, skip_batches: int,
    dest_schema: str, stats: EntityStats, source: SourceConnector,
    check_cancelled: Callable[[int], None] | None,
    on_progress: Callable[..., object] | None,
) -> None:
    """Process entities using a custom SQL query with CTE pagination."""
    offset = skip_batches * batch_size
    if primary_key:
        order_cols = ", ".join(f"[{k}]" for k in primary_key) if isinstance(primary_key, list) else f"[{primary_key}]"
    else:
        order_cols = "(SELECT NULL)"

    while True:
        if check_cancelled:
            check_cancelled(run_id)
        sql = f"WITH _src AS ({custom_sql}) SELECT * FROM _src ORDER BY {order_cols} OFFSET {offset} ROWS FETCH NEXT {batch_size} ROWS ONLY"
        try:
            records = await source.query(sql)  # type: ignore[attr-defined]
        except Exception:
            break
        if not records:
            break
        stats["total"] += len(records)
        batch = [dict(r) if not static_values else {**dict(r), **static_values} for r in records]
        await _flush_batch(dest, dest_table, batch, load_strategy, primary_key, dest_schema, stats)
        if on_progress:
            on_progress(run_id, processed=stats["inserted"] + stats["updated"])
        if len(records) < batch_size:
            break
        offset += batch_size


# ── Helpers ─────────────────────────────────────────────────────────

def _resolve_primary_key(cfg: dict[str, Any], column_map: dict[str, str], is_intersect: bool) -> str | list[str]:
    """Resolve destination primary key from mapping config."""
    if is_intersect:
        composite_keys = cfg.get("composite_keys", [])
        if composite_keys and column_map:
            return [column_map.get(k, k) for k in composite_keys]
        return list(composite_keys) if composite_keys else ""
    pk_src = cfg.get("primary_id", "")
    return column_map.get(pk_src, pk_src) if column_map and pk_src else pk_src


def _build_lookup_fields(cfg: dict[str, Any], column_map: dict[str, str], is_intersect: bool) -> set[str]:
    """Build the set of fields known to be GUIDs."""
    fields = set(cfg.get("lookup_fields", []))
    pk_src = cfg.get("primary_id", "")
    if pk_src:
        fields.add(pk_src)
    if is_intersect:
        for k in cfg.get("composite_keys", []):
            fields.add(k)
            if column_map:
                fields.add(column_map.get(k, k))
    return fields


async def _table_exists(dest: DBProvider, dest_table: str, dest_schema: str) -> bool:
    """Check if a destination table already exists."""
    try:
        return await dest.table_exists(_bare_name(dest_table), dest_schema)
    except Exception:
        return False


async def _discover_attrs(source: SourceConnector, entity_name: str) -> list[dict[str, Any]]:
    """Discover source attributes, returning [] on failure."""
    try:
        attrs = await source.discover_attributes(entity_name)
        return [{"name": a.name, "type": a.type, "nullable": a.nullable} for a in attrs]
    except Exception:
        return []

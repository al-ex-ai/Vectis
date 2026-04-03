"""
ETL Schema — destination table creation, column management.

All dialect-specific SQL is delegated to the DBProvider methods.
"""

import logging
import re
from typing import Any

from vectis.plugins.providers.base import DBProvider
from vectis.services.etl_transforms import (
    CRM_TYPE_MAP,
    infer_sql_type_from_value,
)

logger = logging.getLogger(__name__)

# ── Identifier sanitisation (kept for backward compat) ────────────

_IDENT_RE = re.compile(r"[^a-zA-Z0-9_. ]")

_DANGEROUS_FILTER_RE = re.compile(
    r"\b(DROP|DELETE|INSERT|UPDATE|EXEC|EXECUTE|ALTER|CREATE|TRUNCATE|MERGE|GRANT|REVOKE|DENY)\b",
    re.IGNORECASE,
)


def _safe_filter_expr(expr: str) -> str:
    if not expr or not expr.strip():
        raise ValueError("Empty filter expression")
    if "--" in expr or "/*" in expr:
        raise ValueError(f"Filter expression contains comment syntax: {expr!r}")
    if ";" in expr:
        raise ValueError(f"Filter expression contains statement terminator: {expr!r}")
    if _DANGEROUS_FILTER_RE.search(expr):
        raise ValueError(f"Filter expression contains dangerous keyword: {expr!r}")
    return expr


# ── Table name helpers ──────────────────────────────────────────────

def _bare_name(table: str) -> str:
    parts = table.rsplit(".", 1)
    return parts[-1] if len(parts) > 1 else table


def _schema_from_table(table: str, default: str = "public") -> str:
    """Extract schema from dotted table name, or return default."""
    if "." in table:
        return table.rsplit(".", 1)[0]
    return default


# ── Ensure destination table exists (generic) ──────────────────────

async def ensure_dest_table(
    dest: DBProvider,
    dest_table: str,
    column_map: dict[str, str],
    source_attrs: list[dict[str, Any]],
    primary_key: str | list[str],
    static_values: dict[str, Any] | None = None,
    dest_schema: str = "dbo",
    sample_row: dict[str, Any] | None = None,
    lookup_fields: set[str] | None = None,
) -> None:
    table_name = _bare_name(dest_table)

    if await dest.table_exists(table_name, dest_schema):
        return

    # Ensure schema
    default = dest.default_schema()
    if dest_schema and dest_schema != default:
        await dest.create_schema(dest_schema)

    q = dest.quote_ident
    text_type = dest.default_text_type()
    col_defs: list[str] = []
    attr_type_map = {a.get("name", ""): a.get("type", "String") for a in source_attrs} if source_attrs else {}

    if not attr_type_map and sample_row and column_map:
        for src_col in column_map:
            val = sample_row.get(src_col)
            attr_type_map[src_col] = infer_sql_type_from_value(val).lower() if val is not None else "String"

    if column_map:
        for src_col, dest_col in column_map.items():
            if "," in dest_col:
                for sub_col in dest_col.split(","):
                    col_defs.append(f"{q(sub_col.strip())} {text_type}")
            else:
                raw_type = attr_type_map.get(src_col, "")
                sql_type = _resolve_col_type(raw_type, src_col, sample_row, lookup_fields)
                sql_type = dest.map_type(sql_type)
                col_defs.append(f"{q(dest_col)} {sql_type}")
    elif source_attrs:
        seen_cols: set[str] = set()
        for attr in source_attrs:
            col_name = attr.get("name", "")
            if not col_name or col_name in seen_cols:
                continue
            seen_cols.add(col_name)
            base_type = attr.get("type", "nvarchar")
            precision = attr.get("precision")
            nullable = attr.get("nullable", True)
            sql_type = _resolve_attr_type(base_type, precision)
            sql_type = dest.map_type(sql_type)
            null_spec = "" if nullable else " NOT NULL"
            col_defs.append(f"{q(col_name)} {sql_type}{null_spec}")
    elif sample_row:
        for col_name, val in sample_row.items():
            if lookup_fields and col_name in lookup_fields:
                sql_type = dest.map_type("UNIQUEIDENTIFIER")
            else:
                sql_type = dest.map_type(infer_sql_type_from_value(val))
            col_defs.append(f"{q(col_name)} {sql_type}")
    else:
        col_defs.append(f"{q('_id')} {dest.map_type('NVARCHAR(200)')} NOT NULL")
        col_defs.append(f"{q('_data')} {text_type}")

    # Static values
    if static_values:
        existing_dest_cols = set()
        for d in col_defs:
            m = re.match(r'[\["](.*?)[\]"]', d)
            if m:
                existing_dest_cols.add(m.group(1))
        for key, val in static_values.items():
            if key not in existing_dest_cols:
                if isinstance(val, bool):
                    st = dest.map_type("BIT")
                elif isinstance(val, int):
                    st = dest.map_type("INT")
                else:
                    st = text_type
                col_defs.append(f"{q(key)} {st}")

    # Primary key
    if primary_key:
        pk_names = primary_key if isinstance(primary_key, list) else [primary_key]
        pk_cols = ", ".join([q(k) for k in pk_names])
        col_defs.append(f"PRIMARY KEY ({pk_cols})")

    qualified = dest.qualified_table(table_name, dest_schema)
    create_sql = f"CREATE TABLE {qualified} (\n  {','.join(col_defs)}\n)"
    await dest.execute(create_sql)


def _resolve_col_type(
    raw_type: str, src_col: str,
    sample_row: dict[str, Any] | None, lookup_fields: set[str] | None,
) -> str:
    sql_type: str | None = None
    if raw_type:
        sql_type = CRM_TYPE_MAP.get(raw_type)
        if not sql_type:
            for k, v in CRM_TYPE_MAP.items():
                if k.lower() == raw_type.lower():
                    sql_type = v
                    break
        if not sql_type:
            base = raw_type.split("(")[0].lower().strip()
            from vectis.services.etl_transforms import _NATIVE_SQL_TYPES
            if base in _NATIVE_SQL_TYPES:
                sql_type = raw_type
    if not sql_type and sample_row and src_col in sample_row:
        sql_type = infer_sql_type_from_value(sample_row[src_col])
    if not sql_type and lookup_fields and src_col in lookup_fields:
        sql_type = "UNIQUEIDENTIFIER"
    return sql_type or "NVARCHAR(MAX)"


def _resolve_attr_type(base_type: str, precision: Any) -> str:
    sql_type = CRM_TYPE_MAP.get(base_type)
    if not sql_type:
        for k, v in CRM_TYPE_MAP.items():
            if k.lower() == base_type.lower():
                sql_type = v
                break
    if not sql_type:
        if base_type in ("nvarchar", "varchar", "nchar", "char"):
            sql_type = f"{base_type}({precision})" if precision and int(precision) > 0 else f"{base_type}(MAX)"
        elif base_type in ("decimal", "numeric") and precision:
            sql_type = f"{base_type}({precision})"
        else:
            from vectis.services.etl_transforms import _NATIVE_SQL_TYPES
            if base_type.split("(")[0].lower().strip() in _NATIVE_SQL_TYPES:
                sql_type = base_type
            else:
                sql_type = "NVARCHAR(MAX)"
    return sql_type


# ── Drop table (generic) ──────────────────────────────────────────

async def drop_table(dest: DBProvider, table: str, dest_schema: str = "dbo") -> None:
    try:
        await dest.drop_table_cascade(table, dest_schema)
    except Exception as e:
        logger.info(f"[ETL] FAILED to drop table {dest_schema}.{table}: {e}")


# ── Ensure columns exist (generic) ────────────────────────────────

async def ensure_columns_exist(
    dest: DBProvider, records: list[dict[str, Any]], table: str, dest_schema: str = "dbo",
) -> None:
    if not records:
        return
    table_name = _bare_name(table)
    try:
        cols = await dest.list_columns(table_name, dest_schema)
        existing = {str(c.get("column_name", c.get("COLUMN_NAME", ""))) for c in (cols or [])}
    except Exception:
        return

    import contextlib
    record_cols: set[str] = set()
    for r in records:
        record_cols.update(r.keys())

    text_type = dest.default_text_type()
    for col in record_cols - existing:
        with contextlib.suppress(Exception):
            await dest.add_column(table_name, dest_schema, col, text_type)

"""
ETL Transforms — column mapping, record sanitization, type mapping, filter builders.

Ported from DataBridge's production ETL engine, adapted for Vectis plugin architecture.
"""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── CRM type -> SQL type mapping ────────────────────────────────────

CRM_TYPE_MAP: dict[str, str] = {
    # Short names (from discover_entity_attributes)
    "String": "NVARCHAR(MAX)",
    "Memo": "NVARCHAR(MAX)",
    "Integer": "INT",
    "BigInt": "BIGINT",
    "Double": "FLOAT",
    "Decimal": "DECIMAL(18,4)",
    "Money": "DECIMAL(18,4)",
    "Boolean": "BIT",
    "DateTime": "DATETIME2",
    "Uniqueidentifier": "UNIQUEIDENTIFIER",
    "Lookup": "UNIQUEIDENTIFIER",
    "Customer": "UNIQUEIDENTIFIER",
    "Owner": "UNIQUEIDENTIFIER",
    "Picklist": "INT",
    "State": "INT",
    "Status": "INT",
    "EntityName": "NVARCHAR(200)",
    "Virtual": "NVARCHAR(MAX)",
    "Image": "NVARCHAR(MAX)",
    "MultiSelectPicklist": "NVARCHAR(MAX)",
    "PartyList": "NVARCHAR(MAX)",
    # Full type names (from CRM AttributeTypeName.Value)
    "StringType": "NVARCHAR(MAX)",
    "MemoType": "NVARCHAR(MAX)",
    "IntegerType": "INT",
    "BigIntType": "BIGINT",
    "DoubleType": "FLOAT",
    "DecimalType": "DECIMAL(18,4)",
    "MoneyType": "DECIMAL(18,4)",
    "BooleanType": "BIT",
    "DateTimeType": "DATETIME2",
    "UniqueidentifierType": "UNIQUEIDENTIFIER",
    "LookupType": "UNIQUEIDENTIFIER",
    "CustomerType": "UNIQUEIDENTIFIER",
    "OwnerType": "UNIQUEIDENTIFIER",
    "PicklistType": "INT",
    "StateType": "INT",
    "StatusType": "INT",
    "EntityNameType": "NVARCHAR(200)",
    "VirtualType": "NVARCHAR(MAX)",
    "ImageType": "NVARCHAR(MAX)",
    "MultiSelectPicklistType": "NVARCHAR(MAX)",
    "PartyListType": "NVARCHAR(MAX)",
}

# Native SQL types that pass through unchanged
_NATIVE_SQL_TYPES = frozenset({
    "int", "bigint", "smallint", "tinyint", "bit", "float", "real",
    "decimal", "numeric", "money", "smallmoney", "datetime", "datetime2",
    "date", "time", "uniqueidentifier", "varbinary", "image",
    "nvarchar", "varchar", "nchar", "char", "ntext", "text", "xml",
})


def resolve_sql_type(crm_type: str) -> str:
    """Map a CRM/source attribute type to a SQL column type."""
    if not crm_type:
        return "NVARCHAR(MAX)"
    # Direct match
    if crm_type in CRM_TYPE_MAP:
        return CRM_TYPE_MAP[crm_type]
    # Case-insensitive
    lower = crm_type.lower()
    for k, v in CRM_TYPE_MAP.items():
        if k.lower() == lower:
            return v
    # Native SQL passthrough (e.g. "nvarchar(200)" or "int")
    base = crm_type.split("(")[0].lower().strip()
    if base in _NATIVE_SQL_TYPES:
        return crm_type
    return "NVARCHAR(MAX)"


def infer_sql_type_from_value(value: object) -> str:
    """Infer a SQL type from a Python value."""
    import uuid as _uuid

    if isinstance(value, bool):
        return "BIT"
    if isinstance(value, int):
        return "INT"
    if isinstance(value, float):
        return "FLOAT"
    if isinstance(value, _uuid.UUID):
        return "UNIQUEIDENTIFIER"
    if isinstance(value, str) and len(value) == 36 and value.count("-") == 4:
        try:
            _uuid.UUID(value)
            return "UNIQUEIDENTIFIER"
        except ValueError:
            pass
    return "NVARCHAR(MAX)"


# ── Column mapping ──────────────────────────────────────────────────

def apply_column_map(
    record: dict[str, Any],
    column_map: dict[str, str],
    static_values: dict[str, Any] | None = None,
    column_aliases: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Apply column mapping to transform a source record, then inject static values.

    If column_aliases is provided (and no column_map), all fields pass through but
    aliased fields get renamed: {"crm_field": "CleanName"}.
    """
    if not column_map and column_aliases:
        transformed: dict[str, Any] = {}
        for key, value in record.items():
            if value == "" or value == "00000000-0000-0000-0000-000000000000":
                value = None
            transformed[column_aliases.get(key, key)] = value
    elif not column_map:
        transformed = dict(record)
    else:
        transformed = {}
        for src_col, dest_spec in column_map.items():
            value = record.get(src_col)
            # Empty strings for GUID/lookup fields -> NULL
            if value == "" or value == "00000000-0000-0000-0000-000000000000":
                value = None
            # Multi-column split: "fullname" -> "FirstName, LastName"
            if "," in dest_spec:
                dest_cols = [c.strip() for c in dest_spec.split(",")]
                if value and isinstance(value, str):
                    parts = value.split(" ", len(dest_cols) - 1)
                    for i, dest_col in enumerate(dest_cols):
                        transformed[dest_col] = parts[i] if i < len(parts) else ""
                else:
                    for dest_col in dest_cols:
                        transformed[dest_col] = None
            else:
                transformed[dest_spec] = value

    # Inject static values (e.g., CompanyId = GUID)
    if static_values:
        for key, val in static_values.items():
            transformed[key] = val

    return transformed


def sanitize_record(record: dict[str, Any]) -> dict[str, Any]:
    """Sanitize all values in a record for SQL insertion."""
    import uuid
    from datetime import date, datetime
    from decimal import Decimal

    result: dict[str, Any] = {}
    for k, v in record.items():
        if v is None:
            result[k] = None
        elif isinstance(v, (dict, list)):
            result[k] = json.dumps(v)
        elif isinstance(v, bool):
            result[k] = v
        elif isinstance(v, uuid.UUID):
            result[k] = str(v)
        elif isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, (datetime, date)):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


# ── Filter builders ─────────────────────────────────────────────────

def build_odata_filter(filters: list[dict[str, str]]) -> str:
    """Convert filter conditions to OData $filter string."""
    parts: list[str] = []
    for f in filters:
        field = f.get("field", "")
        op = f.get("operator", "")
        value = f.get("value", "")
        if not field or not op:
            continue
        if op == "is_null":
            parts.append(f"{field} eq null")
        elif op == "not_null":
            parts.append(f"{field} ne null")
        elif op == "contains":
            parts.append(f"contains({field},'{value}')")
        elif op in ("eq", "ne", "gt", "ge", "lt", "le"):
            try:
                float(value)
                parts.append(f"{field} {op} {value}")
            except (ValueError, TypeError):
                if value.lower() in ("true", "false"):
                    parts.append(f"{field} {op} {value.lower()}")
                else:
                    parts.append(f"{field} {op} '{value}'")
    return " and ".join(parts)


def build_sql_where(filters: list[dict[str, str]]) -> tuple[str, dict[str, str]]:
    """Convert filter conditions to SQL WHERE clause + params dict."""
    parts: list[str] = []
    params: dict[str, str] = {}
    op_map = {"eq": "=", "ne": "!=", "gt": ">", "ge": ">=", "lt": "<", "le": "<="}
    for i, f in enumerate(filters):
        field = f.get("field", "")
        op = f.get("operator", "")
        value = f.get("value", "")
        if not field or not op:
            continue
        pname = f"flt{i}"
        if op == "is_null":
            parts.append(f"[{field}] IS NULL")
        elif op == "not_null":
            parts.append(f"[{field}] IS NOT NULL")
        elif op == "contains":
            parts.append(f"[{field}] LIKE @{pname}")
            params[pname] = f"%{value}%"
        elif op in op_map:
            parts.append(f"[{field}] {op_map[op]} @{pname}")
            params[pname] = value
    return (" AND ".join(parts) if parts else "", params)


def parse_mapping_config(mapping: dict[str, Any]) -> dict[str, Any]:
    """Parse mapping_config from JSON string or return dict as-is."""
    raw = mapping.get("mapping_config")
    if isinstance(raw, str):
        try:
            return json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return {}
    return raw or {}

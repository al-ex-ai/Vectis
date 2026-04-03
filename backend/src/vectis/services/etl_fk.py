"""
ETL Foreign Keys — FK management after data load.

All dialect-specific SQL is delegated to the DBProvider methods.
"""

import contextlib
import logging
from typing import Any, Protocol

from vectis.plugins.providers.base import DBProvider
from vectis.services.etl_schema import _bare_name
from vectis.services.etl_transforms import parse_mapping_config


class FKDiscoverable(Protocol):
    async def discover_foreign_keys(self) -> list[dict[str, str]]: ...

logger = logging.getLogger(__name__)


async def add_foreign_keys(
    dest: DBProvider,
    mappings: list[dict[str, Any]],
    dest_schema: str = "dbo",
    all_mappings: list[dict[str, Any]] | None = None,
) -> None:
    """Create FKs based on relations declared in mapping configs."""
    effective = all_mappings or mappings

    source_to_dest: dict[str, dict[str, Any]] = {}
    for m in effective:
        cfg = parse_mapping_config(m)
        col_map = cfg.get("columns") or cfg.get("column_map", {})
        eff_schema = cfg.get("dest_schema") or dest_schema
        source_to_dest[m["source_entity"]] = {
            "dest_table": _bare_name(m["dest_table"]),
            "dest_schema": eff_schema,
            "column_map": col_map,
            "primary_id": cfg.get("primary_id", "id"),
        }

    for m in effective:
        cfg = parse_mapping_config(m)
        col_map = cfg.get("columns") or cfg.get("column_map", {})
        child_table = _bare_name(m["dest_table"])
        child_schema = cfg.get("dest_schema") or dest_schema

        for rel in cfg.get("relations", []):
            parent_entity = rel.get("to_table", "")
            from_col_src = rel.get("from_column", "")
            if parent_entity not in source_to_dest or not from_col_src:
                continue
            parent_info = source_to_dest[parent_entity]
            from_col_dest = col_map.get(from_col_src, from_col_src)
            to_col_src = rel.get("to_column", "")
            to_col_dest = parent_info["column_map"].get(to_col_src, to_col_src)
            if "," in from_col_dest or "," in to_col_dest:
                continue
            with contextlib.suppress(Exception):
                await dest.create_foreign_key(
                    child_schema, child_table, from_col_dest,
                    parent_info["dest_schema"], parent_info["dest_table"], to_col_dest,
                )


async def replicate_foreign_keys(
    dest: DBProvider,
    source_conn: FKDiscoverable,
    mappings: list[dict[str, Any]],
    dest_schema: str = "dbo",
) -> None:
    """Discover FKs from source and replicate on destination."""
    src_to_dest_table: dict[str, str] = {}
    src_to_dest_schema: dict[str, str] = {}
    for m in mappings:
        cfg = parse_mapping_config(m)
        dest_t = _bare_name(m["dest_table"])
        eff_schema = cfg.get("dest_schema") or dest_schema
        src_to_dest_table[m["source_entity"]] = dest_t
        src_to_dest_schema[m["source_entity"]] = eff_schema
        bare_src = _bare_name(m["source_entity"])
        if bare_src != m["source_entity"]:
            src_to_dest_table[bare_src] = dest_t
            src_to_dest_schema[bare_src] = eff_schema

    try:
        fks = await source_conn.discover_foreign_keys()
    except Exception:
        return

    for fk in fks:
        from_src = str(fk["from_table"])
        to_src = str(fk["to_table"])
        if from_src not in src_to_dest_table or to_src not in src_to_dest_table:
            continue
        with contextlib.suppress(Exception):
            await dest.create_foreign_key(
                src_to_dest_schema[from_src], src_to_dest_table[from_src], str(fk["from_column"]),
                src_to_dest_schema[to_src], src_to_dest_table[to_src], str(fk["to_column"]),
            )

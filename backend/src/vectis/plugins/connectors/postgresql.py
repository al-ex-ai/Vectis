"""PostgreSQL source connector — reads data from PostgreSQL tables."""

from __future__ import annotations

from typing import TYPE_CHECKING

import asyncpg

from vectis.plugins.connectors.base import Attribute, Entity, SourceConnector
from vectis.plugins.registry import PluginInfo, registry

if TYPE_CHECKING:
    from collections.abc import AsyncIterator


class PostgreSQLSourceConnector(SourceConnector):
    """Read data from PostgreSQL as a source."""

    source_category = "sql"

    def __init__(self, config: dict[str, str]) -> None:
        self.config = config
        self._conn: asyncpg.Connection | None = None

    async def _connect(self) -> asyncpg.Connection:
        if self._conn:
            return self._conn
        self._conn = await asyncpg.connect(
            host=self.config.get("host", "localhost"),
            port=int(self.config.get("port", "5432")),
            database=self.config.get("database", ""),
            user=self.config.get("username", ""),
            password=self.config.get("password", ""),
        )
        return self._conn

    async def _disconnect(self) -> None:
        if self._conn:
            await self._conn.close()
            self._conn = None

    def _resolve_table(self, entity_name: str) -> tuple[str, str]:
        if "." in entity_name:
            schema, table = entity_name.split(".", 1)
            return schema.strip('"'), table.strip('"')
        return "public", entity_name.strip('"')

    async def test_connection(self) -> bool:
        try:
            conn = await self._connect()
            result = await conn.fetchval("SELECT 1")
            await self._disconnect()
            return result == 1
        except Exception:
            return False

    async def discover_entities(self) -> list[Entity]:
        conn = await self._connect()
        rows = await conn.fetch(
            "SELECT table_schema, table_name "
            "FROM information_schema.tables "
            "WHERE table_type = 'BASE TABLE' "
            "AND table_schema NOT IN ('pg_catalog', 'information_schema') "
            "ORDER BY table_schema, table_name"
        )
        return [
            Entity(
                name=f"{r['table_schema']}.{r['table_name']}",
                display_name=r["table_name"],
                entity_set_name=f"{r['table_schema']}.{r['table_name']}",
            )
            for r in rows
        ]

    async def discover_attributes(self, entity_name: str) -> list[Attribute]:
        schema, table = self._resolve_table(entity_name)
        conn = await self._connect()

        rows = await conn.fetch(
            "SELECT column_name, data_type, is_nullable, character_maximum_length "
            "FROM information_schema.columns "
            "WHERE table_schema = $1 AND table_name = $2 "
            "ORDER BY ordinal_position",
            schema, table,
        )
        pks = await conn.fetch(
            "SELECT a.attname AS col FROM pg_index i "
            "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) "
            "JOIN pg_class c ON c.oid = i.indrelid "
            "JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE i.indisprimary AND n.nspname = $1 AND c.relname = $2",
            schema, table,
        )
        pk_set = {r["col"] for r in pks}

        return [
            Attribute(
                name=r["column_name"],
                display_name=r["column_name"],
                type=r["data_type"],
                required=r["is_nullable"] == "NO",
                nullable=r["is_nullable"] == "YES",
                max_length=r.get("character_maximum_length"),
                is_primary_id=r["column_name"] in pk_set,
            )
            for r in rows
        ]

    async def query(self, sql: str, params: tuple[object, ...] | None = None) -> list[dict[str, object]]:
        conn = await self._connect()
        if params:
            rows = await conn.fetch(sql, *params)
        else:
            rows = await conn.fetch(sql)
        return [dict(r) for r in rows]

    async def fetch_data(
        self,
        entity_name: str,
        columns: list[str] | None = None,
        page_size: int = 1000,
        offset: int = 0,
        filter_expr: str | None = None,
        entity_set_name: str | None = None,
    ) -> AsyncIterator[dict[str, object]]:
        schema, table = self._resolve_table(entity_name)
        col_list = ", ".join([f'"{c}"' for c in columns]) if columns else "*"
        sql = f'SELECT {col_list} FROM "{schema}"."{table}"'
        if filter_expr:
            sql += f" WHERE {filter_expr}"

        conn = await self._connect()
        # Use a cursor for memory-efficient streaming
        async with conn.transaction():
            async for record in conn.cursor(sql):
                yield dict(record)

    async def get_count(self, entity_name: str) -> int:
        schema, table = self._resolve_table(entity_name)
        conn = await self._connect()
        result = await conn.fetchval(f'SELECT COUNT(*) FROM "{schema}"."{table}"')
        return int(result) if result else 0

    async def discover_foreign_keys(self) -> list[dict[str, str]]:
        conn = await self._connect()
        rows = await conn.fetch(
            "SELECT tc.table_name AS from_table, "
            "kcu.column_name AS from_column, "
            "ccu.table_name AS to_table, "
            "ccu.column_name AS to_column "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema "
            "JOIN information_schema.constraint_column_usage ccu "
            "ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.constraint_schema "
            "WHERE tc.constraint_type = 'FOREIGN KEY'"
        )
        return [
            {"from_table": str(r["from_table"]), "from_column": str(r["from_column"]),
             "to_table": str(r["to_table"]), "to_column": str(r["to_column"])}
            for r in rows
        ]


registry.register_connector(
    PluginInfo(
        name="PostgreSQL Source",
        type="connector",
        description="Read data from PostgreSQL databases as a source. Supports table discovery, column metadata, and streaming data extraction.",
        version="0.1.0",
        author="Vectis",
        connection_types=["postgresql"],
        config_schema={
            "host": {"type": "string", "default": "localhost"},
            "port": {"type": "number", "default": 5432},
            "database": {"type": "string", "required": True},
            "username": {"type": "string", "required": True},
            "password": {"type": "string", "required": True, "secret": True},
        },
        builtin=True,
    ),
    PostgreSQLSourceConnector,
)

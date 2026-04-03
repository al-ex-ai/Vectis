"""PostgreSQL provider — built-in plugin with real asyncpg implementation."""

from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

import asyncpg

from vectis.plugins.providers.base import ColumnInfo, DBProvider
from vectis.plugins.registry import PluginInfo, registry

if TYPE_CHECKING:
    from collections.abc import Sequence


class PostgreSQLProvider(DBProvider):
    """Connects to PostgreSQL via asyncpg."""

    dialect = "postgresql"

    _TYPE_MAP: ClassVar[dict[str, str]] = {
        "nvarchar(max)": "text", "nvarchar": "varchar", "varchar(max)": "text",
        "nchar": "char", "ntext": "text", "bit": "boolean",
        "datetime": "timestamp", "datetime2": "timestamp",
        "datetimeoffset": "timestamptz", "smalldatetime": "timestamp",
        "uniqueidentifier": "uuid", "int": "integer", "bigint": "bigint",
        "smallint": "smallint", "tinyint": "smallint",
        "float": "double precision", "real": "real",
        "money": "numeric(19,4)", "smallmoney": "numeric(10,4)",
        "image": "bytea", "varbinary(max)": "bytea", "varbinary": "bytea", "binary": "bytea",
    }

    def map_type(self, source_type: str) -> str:
        import re as _re
        lower = source_type.lower().strip()
        if lower in self._TYPE_MAP:
            return self._TYPE_MAP[lower]
        m = _re.match(r"nvarchar\((\d+)\)", lower)
        if m:
            return f"varchar({m.group(1)})"
        if lower.startswith(("decimal", "numeric", "varchar(", "char(")):
            return source_type
        pg_native = {
            "text", "varchar", "char", "integer", "bigint", "smallint", "boolean",
            "timestamp", "timestamptz", "date", "time", "uuid", "jsonb", "json",
            "bytea", "real", "double precision", "character varying",
            "timestamp without time zone", "timestamp with time zone",
        }
        if lower.split("(")[0].strip() in pg_native:
            return source_type
        return "text"

    def __init__(self, config: dict[str, str]) -> None:
        self.config = config
        self._conn: asyncpg.Connection | None = None

    async def connect(self) -> None:
        if self._conn:
            return
        self._conn = await asyncpg.connect(
            host=self.config.get("host", "localhost"),
            port=int(self.config.get("port", "5432")),
            database=self.config.get("database", ""),
            user=self.config.get("username", ""),
            password=self.config.get("password", ""),
        )

    async def disconnect(self) -> None:
        if self._conn:
            await self._conn.close()
            self._conn = None

    async def test_connection(self) -> bool:
        try:
            await self.connect()
            result = await self._conn.fetchval("SELECT 1")  # type: ignore[union-attr]
            await self.disconnect()
            return result == 1
        except Exception:
            return False

    async def query(self, sql: str, params: dict[str, object] | None = None) -> list[dict[str, object]]:
        if not self._conn:
            await self.connect()
        assert self._conn is not None
        # asyncpg uses $1, $2 positional params, but our interface passes tuple/dict
        # For simple queries without params, just execute directly
        if params and isinstance(params, (list, tuple)):
            rows = await self._conn.fetch(sql, *params)
        else:
            rows = await self._conn.fetch(sql)
        return [dict(r) for r in rows]

    async def execute(self, sql: str, params: dict[str, object] | None = None) -> int:
        if not self._conn:
            await self.connect()
        assert self._conn is not None
        if params and isinstance(params, (list, tuple)):
            result = await self._conn.execute(sql, *params)
        else:
            result = await self._conn.execute(sql)
        # asyncpg returns e.g. "INSERT 0 5" or "DELETE 3"
        try:
            return int(result.split()[-1])
        except (ValueError, IndexError):
            return 0

    async def bulk_insert(self, table: str, rows: Sequence[dict[str, object]]) -> int:
        if not rows:
            return 0
        if not self._conn:
            await self.connect()
        assert self._conn is not None

        columns = list(rows[0].keys())
        col_list = ", ".join([f'"{c}"' for c in columns])
        placeholders = ", ".join([f"${i+1}" for i in range(len(columns))])
        sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"

        data = [tuple(r.get(c) for c in columns) for r in rows]
        await self._conn.executemany(sql, data)
        return len(data)

    async def bulk_upsert(
        self, table: str, rows: Sequence[dict[str, object]], key_columns: list[str],
    ) -> int:
        if not rows:
            return 0
        if not self._conn:
            await self.connect()
        assert self._conn is not None

        columns = list(rows[0].keys())
        col_list = ", ".join([f'"{c}"' for c in columns])
        placeholders = ", ".join([f"${i+1}" for i in range(len(columns))])
        key_list = ", ".join([f'"{k}"' for k in key_columns])
        update_cols = [c for c in columns if c not in key_columns]
        update_set = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in update_cols])

        sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) ON CONFLICT ({key_list}) DO UPDATE SET {update_set}"

        data = [tuple(r.get(c) for c in columns) for r in rows]
        await self._conn.executemany(sql, data)
        return len(data)

    async def get_columns(self, table: str) -> list[ColumnInfo]:
        if not self._conn:
            await self.connect()
        assert self._conn is not None

        # Parse schema.table
        if "." in table:
            schema, tbl = table.rsplit(".", 1)
            schema = schema.strip('"')
            tbl = tbl.strip('"')
        else:
            schema, tbl = "public", table.strip('"')

        rows = await self._conn.fetch(
            "SELECT column_name, data_type, is_nullable, character_maximum_length "
            "FROM information_schema.columns "
            "WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
            schema, tbl,
        )
        return [
            ColumnInfo(
                name=r["column_name"],
                type=r["data_type"],
                nullable=r["is_nullable"] == "YES",
                max_length=r.get("character_maximum_length"),
            )
            for r in rows
        ]

    async def ensure_table(self, table: str, columns: list[ColumnInfo]) -> None:
        if not self._conn:
            await self.connect()
        assert self._conn is not None

        if "." in table:
            schema, tbl = table.rsplit(".", 1)
            schema = schema.strip('"')
            tbl = tbl.strip('"')
        else:
            schema, tbl = "public", table.strip('"')

        # Check if table exists
        exists = await self._conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)",
            schema, tbl,
        )

        if exists:
            # Add missing columns
            existing = {c.name for c in await self.get_columns(f"{schema}.{tbl}")}
            for col in columns:
                if col.name not in existing:
                    null = "" if col.nullable else " NOT NULL"
                    await self._conn.execute(
                        f'ALTER TABLE "{schema}"."{tbl}" ADD COLUMN "{col.name}" {col.type}{null}'
                    )
            return

        # Create schema if needed
        if schema != "public":
            await self._conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')

        # Create table
        col_defs = []
        for col in columns:
            null = "" if col.nullable else " NOT NULL"
            col_defs.append(f'"{col.name}" {col.type}{null}')

        pk_cols = [col.name for col in columns if col.is_primary_key]
        if pk_cols:
            pk_list = ", ".join([f'"{c}"' for c in pk_cols])
            col_defs.append(f"PRIMARY KEY ({pk_list})")

        await self._conn.execute(
            f'CREATE TABLE "{schema}"."{tbl}" ({", ".join(col_defs)})'
        )


registry.register_provider(
    PluginInfo(
        name="PostgreSQL",
        type="provider",
        description="Connect to PostgreSQL databases. Supports bulk inserts, ON CONFLICT upsert, schema discovery, and DDL management.",
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
    PostgreSQLProvider,
)

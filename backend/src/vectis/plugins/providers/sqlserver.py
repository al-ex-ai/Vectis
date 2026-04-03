"""SQL Server provider — built-in plugin with real pymssql implementation."""

from __future__ import annotations

import asyncio
import contextlib
from typing import TYPE_CHECKING

from vectis.plugins.providers.base import ColumnInfo, DBProvider
from vectis.plugins.registry import PluginInfo, registry

if TYPE_CHECKING:
    from collections.abc import Sequence

    import pymssql


def _parse_conn_str(cs: str) -> dict[str, str]:
    """Parse SQL Server connection string into dict."""
    parts: dict[str, str] = {}
    for part in cs.split(";"):
        if "=" not in part:
            continue
        key, val = part.split("=", 1)
        parts[key.strip().lower()] = val.strip()
    return {
        "server": parts.get("server", ""),
        "database": parts.get("database", ""),
        "user": parts.get("user id", parts.get("uid", "")),
        "password": parts.get("password", parts.get("pwd", "")),
    }


def _resolve_conn_params(config: dict[str, str]) -> dict[str, str]:
    cs = config.get("connection_string", "")
    if cs:
        return _parse_conn_str(cs)
    return {
        "server": config.get("server", ""),
        "database": config.get("database", ""),
        "user": config.get("username", ""),
        "password": config.get("password", ""),
    }


class SqlServerProvider(DBProvider):
    """Connects to SQL Server / Azure SQL via pymssql."""

    dialect = "sqlserver"

    def quote_ident(self, name: str) -> str:
        return f"[{name}]"

    def param(self, index: int) -> str:
        return "%s"

    def default_text_type(self) -> str:
        return "NVARCHAR(MAX)"

    def default_schema(self) -> str:
        return "dbo"

    async def table_exists(self, table: str, schema: str) -> bool:
        result = await self.query(
            "SELECT OBJECT_ID(%s, 'U') AS tbl_id", (f"{schema}.{table}",)
        )
        return bool(result and result[0].get("tbl_id") is not None)

    async def schema_exists(self, schema: str) -> bool:
        result = await self.query("SELECT SCHEMA_ID(%s) AS sid", (schema,))
        return bool(result and result[0].get("sid") is not None)

    async def create_schema(self, schema: str) -> None:
        if not await self.schema_exists(schema):
            await self.execute(f"CREATE SCHEMA [{schema}]")

    async def list_columns(self, table: str, schema: str) -> list[dict[str, object]]:
        return await self.query(
            "SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, "
            "IS_NULLABLE AS is_nullable, CHARACTER_MAXIMUM_LENGTH AS character_maximum_length "
            "FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME = %s AND TABLE_SCHEMA = %s ORDER BY ORDINAL_POSITION",
            (table, schema),
        )

    async def drop_table_cascade(self, table: str, schema: str) -> None:
        qualified = self.qualified_table(table, schema)
        try:
            fks = await self.query(
                "SELECT SCHEMA_NAME(t.schema_id) AS parent_schema, "
                "t.name AS parent_table, fk.name AS fk_name "
                "FROM sys.foreign_keys fk "
                "JOIN sys.tables t ON fk.parent_object_id = t.object_id "
                f"WHERE fk.referenced_object_id = OBJECT_ID('{schema}.{table}') "
                f"OR fk.parent_object_id = OBJECT_ID('{schema}.{table}')"
            )
            for fk in fks:
                with contextlib.suppress(Exception):
                    await self.execute(
                        f"ALTER TABLE [{fk['parent_schema']}].[{fk['parent_table']}] "
                        f"DROP CONSTRAINT [{fk['fk_name']}]"
                    )
        except Exception:
            pass
        with contextlib.suppress(Exception):
            await self.execute(f"DROP TABLE IF EXISTS {qualified}")

    async def add_column(self, table: str, schema: str, col_name: str, col_type: str) -> None:
        qualified = self.qualified_table(table, schema)
        await self.execute(f"ALTER TABLE {qualified} ADD [{col_name}] {col_type} NULL")

    async def preview_rows(self, table: str, schema: str, limit: int, offset: int) -> list[dict[str, object]]:
        qualified = self.qualified_table(table, schema)
        return await self.query(
            f"SELECT * FROM {qualified} ORDER BY (SELECT NULL) OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"
        )

    async def discover_tables(self) -> list[dict[str, str]]:
        rows = await self.query(
            "SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name "
            "FROM INFORMATION_SCHEMA.TABLES "
            "WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA NOT IN ('sys','INFORMATION_SCHEMA') "
            "ORDER BY TABLE_SCHEMA, TABLE_NAME"
        )
        return [{"table_schema": str(r["table_schema"]), "table_name": str(r["table_name"])} for r in rows]

    async def discover_column_details(self, table: str, schema: str) -> list[dict[str, object]]:
        rows = await self.query(
            "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, "
            "CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE "
            "FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s "
            "ORDER BY ORDINAL_POSITION",
            (schema, table),
        )
        return [
            {
                "column_name": str(r["COLUMN_NAME"]), "data_type": str(r["DATA_TYPE"]),
                "is_nullable": str(r["IS_NULLABLE"]),
                "character_maximum_length": r.get("CHARACTER_MAXIMUM_LENGTH"),
                "numeric_precision": r.get("NUMERIC_PRECISION"),
                "numeric_scale": r.get("NUMERIC_SCALE"),
            }
            for r in rows
        ]

    async def discover_primary_keys(self, table: str, schema: str) -> set[str]:
        rows = await self.query(
            "SELECT COL_NAME(ic.object_id, ic.column_id) AS col "
            "FROM sys.indexes i "
            "JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id "
            "WHERE i.is_primary_key = 1 "
            "AND OBJECT_SCHEMA_NAME(i.object_id) = %s AND OBJECT_NAME(i.object_id) = %s",
            (schema, table),
        )
        return {str(r["col"]) for r in rows}

    async def discover_foreign_keys_detailed(self) -> list[dict[str, str]]:
        rows = await self.query(
            "SELECT fk.name AS fk_name, "
            "OBJECT_SCHEMA_NAME(fk.parent_object_id) AS from_schema, "
            "OBJECT_NAME(fk.parent_object_id) AS from_table, "
            "COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS from_column, "
            "OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS to_schema, "
            "OBJECT_NAME(fk.referenced_object_id) AS to_table, "
            "COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS to_column "
            "FROM sys.foreign_keys fk "
            "JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id"
        )
        return [
            {"fk_name": str(r["fk_name"]), "from_schema": str(r["from_schema"]),
             "from_table": str(r["from_table"]), "from_column": str(r["from_column"]),
             "to_schema": str(r["to_schema"]), "to_table": str(r["to_table"]),
             "to_column": str(r["to_column"])}
            for r in rows
        ]

    async def discover_foreign_keys(self) -> list[dict[str, str]]:
        rows = await self.query(
            "SELECT "
            "OBJECT_NAME(fk.parent_object_id) AS from_table, "
            "COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS from_column, "
            "OBJECT_NAME(fk.referenced_object_id) AS to_table, "
            "COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS to_column "
            "FROM sys.foreign_keys fk "
            "JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id"
        )
        return [
            {"from_table": str(r["from_table"]), "from_column": str(r["from_column"]),
             "to_table": str(r["to_table"]), "to_column": str(r["to_column"])}
            for r in rows
        ]

    async def create_foreign_key(
        self, child_schema: str, child_table: str, from_col: str,
        parent_schema: str, parent_table: str, to_col: str,
    ) -> None:
        q = self.quote_ident
        fk_name = f"FK_{child_schema}_{child_table}_{from_col}"
        child_q = self.qualified_table(child_table, child_schema)
        parent_q = self.qualified_table(parent_table, parent_schema)
        import contextlib
        with contextlib.suppress(Exception):
            await self.execute(
                f"IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = '{fk_name}') "
                f"ALTER TABLE {child_q} ADD CONSTRAINT {q(fk_name)} "
                f"FOREIGN KEY ({q(from_col)}) REFERENCES {parent_q} ({q(to_col)})"
            )

    def __init__(self, config: dict[str, str]) -> None:
        self.config = config
        self._conn: pymssql.Connection | None = None

    # ── sync helpers (run via asyncio.to_thread) ─────────────────────

    def _connect_sync(self) -> None:
        import pymssql

        p = _resolve_conn_params(self.config)
        password = p["password"].replace("\\!", "!").replace("\\@", "@")
        self._conn = pymssql.connect(
            server=p["server"],
            database=p["database"],
            user=p["user"],
            password=password,
            tds_version="7.4",
            autocommit=True,
        )

    def _ensure_conn(self) -> None:
        if not self._conn:
            self._connect_sync()

    def _query_sync(self, sql: str, params: object = ()) -> list[dict[str, object]]:
        self._ensure_conn()
        assert self._conn is not None
        cursor = self._conn.cursor(as_dict=True)
        cursor.execute(sql, params)
        return cursor.fetchall()

    def _execute_sync(self, sql: str, params: object = ()) -> int:
        self._ensure_conn()
        assert self._conn is not None
        cursor = self._conn.cursor()
        cursor.execute(sql, params)
        return cursor.rowcount

    def _bulk_insert_sync(self, table: str, rows: Sequence[dict[str, object]]) -> int:
        if not rows:
            return 0
        self._ensure_conn()
        assert self._conn is not None
        columns = list(rows[0].keys())
        col_list = ", ".join([f"[{c}]" for c in columns])
        placeholders = ", ".join(["%s" for _ in columns])
        sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"
        data = [tuple(r.get(c) for c in columns) for r in rows]
        cursor = self._conn.cursor()
        cursor.executemany(sql, data)
        return len(data)

    def _bulk_upsert_sync(
        self, table: str, rows: Sequence[dict[str, object]], key_columns: list[str],
    ) -> int:
        if not rows:
            return 0
        self._ensure_conn()
        assert self._conn is not None

        columns = list(rows[0].keys())
        col_list = ", ".join([f"[{c}]" for c in columns])
        placeholders = ", ".join(["%s" for _ in columns])

        temp = f"#tmp_{table.replace('.', '_').replace('[', '').replace(']', '')}"
        cursor = self._conn.cursor()

        cursor.execute(f"SELECT TOP 0 * INTO {temp} FROM {table}")

        sql = f"INSERT INTO {temp} ({col_list}) VALUES ({placeholders})"
        data = [tuple(r.get(c) for c in columns) for r in rows]
        cursor.executemany(sql, data)

        on_clause = " AND ".join([f"t.[{k}] = s.[{k}]" for k in key_columns])
        update_cols = [c for c in columns if c not in key_columns]
        update_set = ", ".join([f"t.[{c}] = s.[{c}]" for c in update_cols])
        insert_cols = ", ".join([f"[{c}]" for c in columns])
        insert_vals = ", ".join([f"s.[{c}]" for c in columns])

        merge_sql = f"""
            MERGE {table} AS t
            USING {temp} AS s ON {on_clause}
            WHEN MATCHED THEN UPDATE SET {update_set}
            WHEN NOT MATCHED THEN INSERT ({insert_cols}) VALUES ({insert_vals});
        """
        cursor.execute(merge_sql)
        cursor.execute(f"DROP TABLE {temp}")
        return len(data)

    # ── async interface ──────────────────────────────────────────────

    async def connect(self) -> None:
        await asyncio.to_thread(self._connect_sync)

    async def disconnect(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    async def test_connection(self) -> bool:
        try:
            await self.connect()
            result = await self.query("SELECT 1 AS ok")
            await self.disconnect()
            return bool(result)
        except Exception:
            return False

    async def query(self, sql: str, params: dict[str, object] | None = None) -> list[dict[str, object]]:
        return await asyncio.to_thread(self._query_sync, sql, params or ())

    async def execute(self, sql: str, params: dict[str, object] | None = None) -> int:
        return await asyncio.to_thread(self._execute_sync, sql, params or ())

    async def bulk_insert(self, table: str, rows: Sequence[dict[str, object]]) -> int:
        return await asyncio.to_thread(self._bulk_insert_sync, table, rows)

    async def bulk_upsert(
        self, table: str, rows: Sequence[dict[str, object]], key_columns: list[str],
    ) -> int:
        return await asyncio.to_thread(self._bulk_upsert_sync, table, rows, key_columns)

    async def get_columns(self, table: str) -> list[ColumnInfo]:
        rows = await self.query(
            "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH "
            "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = %s ORDER BY ORDINAL_POSITION",
            (table.split(".")[-1],),
        )
        return [
            ColumnInfo(
                name=r["COLUMN_NAME"],
                type=r["DATA_TYPE"],
                nullable=r["IS_NULLABLE"] == "YES",
                max_length=r.get("CHARACTER_MAXIMUM_LENGTH"),
            )
            for r in rows
        ]

    async def ensure_table(self, table: str, columns: list[ColumnInfo]) -> None:
        parts = table.split(".")
        schema = parts[0] if len(parts) > 1 else "dbo"
        tbl_name = parts[-1]

        result = await self.query(
            "SELECT OBJECT_ID(%s, 'U') AS tbl_id", (f"{schema}.{tbl_name}",)
        )
        if result and result[0].get("tbl_id") is not None:
            existing = {c.name for c in await self.get_columns(tbl_name)}
            for col in columns:
                if col.name not in existing:
                    await self.execute(
                        f"ALTER TABLE [{schema}].[{tbl_name}] ADD [{col.name}] {col.type} NULL"
                    )
            return

        if schema != "dbo":
            sid = await self.query("SELECT SCHEMA_ID(%s) AS sid", (schema,))
            if not sid or sid[0].get("sid") is None:
                await self.execute(f"CREATE SCHEMA [{schema}]")

        col_defs = []
        for col in columns:
            null_spec = "" if col.nullable else " NOT NULL"
            col_defs.append(f"[{col.name}] {col.type}{null_spec}")

        pk_cols = [col.name for col in columns if col.is_primary_key]
        if pk_cols:
            pk_list = ", ".join([f"[{c}]" for c in pk_cols])
            col_defs.append(f"PRIMARY KEY ({pk_list})")

        create_sql = f"CREATE TABLE [{schema}].[{tbl_name}] ({', '.join(col_defs)})"
        await self.execute(create_sql)


registry.register_provider(
    PluginInfo(
        name="SQL Server",
        type="provider",
        description="Connect to Microsoft SQL Server and Azure SQL Database. Supports bulk insert, MERGE upsert, schema discovery, and DDL management.",
        version="0.1.0",
        author="Vectis",
        connection_types=["sqlserver", "azure_sql"],
        config_schema={
            "connection_string": {"type": "string", "required": False, "placeholder": "Server=...;Database=..."},
            "server": {"type": "string", "required": False},
            "database": {"type": "string", "required": False},
            "username": {"type": "string", "required": False},
            "password": {"type": "string", "required": False, "secret": True},
        },
        builtin=True,
    ),
    SqlServerProvider,
)

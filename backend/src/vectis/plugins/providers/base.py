"""Base interface for database providers (SQL Server, PostgreSQL, etc.)."""

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass
class ColumnInfo:
    name: str
    type: str
    nullable: bool = True
    max_length: int | None = None
    is_primary_key: bool = False


class DBProvider(ABC):
    """Interface that all database providers must implement."""

    # ── Dialect info (override in subclass) ─────────────────────────

    dialect: str = "generic"
    """Identifier for SQL dialect: 'postgresql', 'sqlserver', 'mysql', etc."""

    def quote_ident(self, name: str) -> str:
        """Quote an identifier for this dialect. Default: double quotes (ANSI SQL)."""
        return f'"{name}"'

    def qualified_table(self, table: str, schema: str | None = None) -> str:
        """Return a fully qualified table reference."""
        if "." in table and not schema:
            schema, table = table.rsplit(".", 1)
        if schema:
            return f"{self.quote_ident(schema)}.{self.quote_ident(table)}"
        return self.quote_ident(table)

    def param(self, index: int) -> str:
        """Return a parameter placeholder for this dialect. 1-indexed."""
        return f"${index}"

    async def table_exists(self, table: str, schema: str) -> bool:
        """Check if a table exists. Default uses information_schema."""
        p1, p2 = self.param(1), self.param(2)
        result = await self.query(
            "SELECT 1 FROM information_schema.tables "
            f"WHERE table_schema = {p1} AND table_name = {p2} LIMIT 1",
            (schema, table),
        )
        return len(result) > 0

    async def schema_exists(self, schema: str) -> bool:
        """Check if a schema exists."""
        p1 = self.param(1)
        result = await self.query(
            "SELECT 1 FROM information_schema.schemata "
            f"WHERE schema_name = {p1} LIMIT 1",
            (schema,),
        )
        return len(result) > 0

    async def create_schema(self, schema: str) -> None:
        """Create a schema if it doesn't exist."""
        await self.execute(f"CREATE SCHEMA IF NOT EXISTS {self.quote_ident(schema)}")

    async def list_columns(self, table: str, schema: str) -> list[dict[str, object]]:
        """List columns for a table via information_schema."""
        p1, p2 = self.param(1), self.param(2)
        return await self.query(
            "SELECT column_name, data_type, is_nullable, character_maximum_length "
            "FROM information_schema.columns "
            f"WHERE table_schema = {p1} AND table_name = {p2} "
            "ORDER BY ordinal_position",
            (schema, table),
        )

    async def drop_table_cascade(self, table: str, schema: str) -> None:
        """Drop a table with cascade."""
        qualified = self.qualified_table(table, schema)
        await self.execute(f"DROP TABLE IF EXISTS {qualified} CASCADE")

    async def add_column(self, table: str, schema: str, col_name: str, col_type: str) -> None:
        """Add a column to an existing table."""
        qualified = self.qualified_table(table, schema)
        await self.execute(
            f"ALTER TABLE {qualified} ADD COLUMN {self.quote_ident(col_name)} {col_type}"
        )

    async def preview_rows(self, table: str, schema: str, limit: int, offset: int) -> list[dict[str, object]]:
        """Fetch rows for preview with pagination."""
        qualified = self.qualified_table(table, schema)
        return await self.query(f"SELECT * FROM {qualified} LIMIT {limit} OFFSET {offset}")

    async def row_count(self, table: str, schema: str) -> int:
        """Count rows in a table."""
        qualified = self.qualified_table(table, schema)
        result = await self.query(f"SELECT COUNT(*) AS cnt FROM {qualified}")
        return int(result[0]["cnt"]) if result else 0

    def map_type(self, source_type: str) -> str:
        """Map a source column type to this dialect's native type. Override per dialect."""
        return source_type

    def default_text_type(self) -> str:
        """Return the default variable-length text type for this dialect."""
        return "text"

    def default_schema(self) -> str:
        """Return the default schema name for this dialect."""
        return "public"

    async def discover_tables(self) -> list[dict[str, str]]:
        """Return list of {table_schema, table_name} for all user tables. Override per dialect."""
        rows = await self.query(
            "SELECT table_schema, table_name "
            "FROM information_schema.tables "
            "WHERE table_type = 'BASE TABLE' "
            "AND table_schema NOT IN ('pg_catalog','information_schema') "
            "ORDER BY table_schema, table_name"
        )
        return [{"table_schema": str(r["table_schema"]), "table_name": str(r["table_name"])} for r in rows]

    async def discover_column_details(self, table: str, schema: str) -> list[dict[str, object]]:
        """Return column metadata for a table. Override per dialect."""
        p1, p2 = self.param(1), self.param(2)
        rows = await self.query(
            "SELECT column_name, data_type, is_nullable, "
            "character_maximum_length, numeric_precision, numeric_scale "
            "FROM information_schema.columns "
            f"WHERE table_schema = {p1} AND table_name = {p2} "
            "ORDER BY ordinal_position",
            (schema, table),
        )
        return [
            {
                "column_name": str(r["column_name"]), "data_type": str(r["data_type"]),
                "is_nullable": str(r["is_nullable"]),
                "character_maximum_length": r.get("character_maximum_length"),
                "numeric_precision": r.get("numeric_precision"),
                "numeric_scale": r.get("numeric_scale"),
            }
            for r in rows
        ]

    async def discover_primary_keys(self, table: str, schema: str) -> set[str]:
        """Return column names that form the primary key. Override per dialect."""
        p1, p2 = self.param(1), self.param(2)
        rows = await self.query(
            "SELECT a.attname AS col FROM pg_index i "
            "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) "
            "JOIN pg_class c ON c.oid = i.indrelid "
            "JOIN pg_namespace n ON n.oid = c.relnamespace "
            f"WHERE i.indisprimary AND n.nspname = {p1} AND c.relname = {p2}",
            (schema, table),
        )
        return {str(r["col"]) for r in rows}

    async def discover_foreign_keys_detailed(self) -> list[dict[str, str]]:
        """Discover FKs with schema info. Returns list of {fk_name, from_schema, from_table, from_column, to_schema, to_table, to_column}.

        Override per dialect. Default uses information_schema.
        """
        rows = await self.query(
            "SELECT tc.constraint_name AS fk_name, "
            "tc.table_schema AS from_schema, tc.table_name AS from_table, "
            "kcu.column_name AS from_column, "
            "ccu.table_schema AS to_schema, ccu.table_name AS to_table, "
            "ccu.column_name AS to_column "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema "
            "JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.constraint_schema "
            "WHERE tc.constraint_type = 'FOREIGN KEY'"
        )
        return [
            {"fk_name": str(r.get("fk_name", "")), "from_schema": str(r["from_schema"]),
             "from_table": str(r["from_table"]), "from_column": str(r["from_column"]),
             "to_schema": str(r["to_schema"]), "to_table": str(r["to_table"]),
             "to_column": str(r["to_column"])}
            for r in rows
        ]

    async def discover_foreign_keys(self) -> list[dict[str, str]]:
        """Discover all foreign keys. Returns list of {from_table, from_column, to_table, to_column}.

        Default uses information_schema. Override for dialect-specific queries.
        """
        rows = await self.query(
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

    async def create_foreign_key(
        self, child_schema: str, child_table: str, from_col: str,
        parent_schema: str, parent_table: str, to_col: str,
    ) -> None:
        """Create a foreign key constraint. Override for dialect-specific syntax."""
        q = self.quote_ident
        fk_name = f"FK_{child_schema}_{child_table}_{from_col}"
        child_q = self.qualified_table(child_table, child_schema)
        parent_q = self.qualified_table(parent_table, parent_schema)
        await self.execute(
            f"DO $$ BEGIN "
            f"IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{fk_name}') THEN "
            f"ALTER TABLE {child_q} ADD CONSTRAINT {q(fk_name)} "
            f"FOREIGN KEY ({q(from_col)}) REFERENCES {parent_q} ({q(to_col)}); "
            f"END IF; END $$"
        )

    # ── Core abstract methods ───────────────────────────────────────

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    @abstractmethod
    async def test_connection(self) -> bool: ...

    @abstractmethod
    async def query(self, sql: str, params: dict[str, object] | None = None) -> list[dict[str, object]]: ...

    @abstractmethod
    async def execute(self, sql: str, params: dict[str, object] | None = None) -> int: ...

    @abstractmethod
    async def bulk_insert(self, table: str, rows: Sequence[dict[str, object]]) -> int: ...

    @abstractmethod
    async def bulk_upsert(self, table: str, rows: Sequence[dict[str, object]], key_columns: list[str]) -> int: ...

    @abstractmethod
    async def get_columns(self, table: str) -> list[ColumnInfo]: ...

    @abstractmethod
    async def ensure_table(self, table: str, columns: list[ColumnInfo]) -> None: ...

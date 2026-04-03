from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.connection import Connection
from vectis.schemas.connections import (
    ConnectionCreate,
    ConnectionResponse,
    ConnectionTestResult,
    ConnectionUpdate,
)


class ConnectionService:
    def __init__(self, session: AsyncSession, org_id: int | None = None) -> None:
        self.session = session
        self.org_id = org_id

    async def _get_or_404(self, conn_id: int) -> Connection:
        stmt = select(Connection).where(Connection.id == conn_id)
        if self.org_id is not None:
            stmt = stmt.where(Connection.org_id == self.org_id)
        result = await self.session.execute(stmt)
        conn = result.scalar_one_or_none()
        if not conn:
            raise HTTPException(status_code=404, detail=f"Connection {conn_id} not found")
        return conn

    async def list_all(self) -> list[ConnectionResponse]:
        stmt = select(Connection).order_by(Connection.created_at.desc())
        if self.org_id is not None:
            stmt = stmt.where(Connection.org_id == self.org_id)
        result = await self.session.execute(stmt)
        return [ConnectionResponse.model_validate(c) for c in result.scalars().all()]

    async def get_by_id(self, conn_id: int) -> ConnectionResponse:
        connection = await self._get_or_404(conn_id)
        return ConnectionResponse.model_validate(connection)

    async def create(self, data: ConnectionCreate, created_by: str = "") -> ConnectionResponse:
        connection = Connection(**data.model_dump(), org_id=self.org_id, created_by=created_by)
        self.session.add(connection)
        await self.session.commit()
        await self.session.refresh(connection)
        return ConnectionResponse.model_validate(connection)

    async def update(self, conn_id: int, data: ConnectionUpdate) -> ConnectionResponse:
        connection = await self._get_or_404(conn_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(connection, key, value)
        await self.session.commit()
        await self.session.refresh(connection)
        return ConnectionResponse.model_validate(connection)

    async def delete(self, conn_id: int) -> None:
        connection = await self._get_or_404(conn_id)
        await self.session.delete(connection)
        await self.session.commit()

    async def test_connection(self, conn_id: int) -> ConnectionTestResult:
        connection = await self._get_or_404(conn_id)

        from vectis.plugins.registry import registry

        connector_cls = registry.get_connector(connection.type)
        provider_cls = registry.get_provider(connection.type)

        try:
            if connector_cls:
                plugin = connector_cls(connection.config)
                ok = await plugin.test_connection()
                if ok:
                    return ConnectionTestResult(
                        success=True, message=f"Connected to {connection.name}"
                    )
                return ConnectionTestResult(
                    success=False, error=f"Connection to {connection.name} failed"
                )

            if provider_cls:
                plugin = provider_cls(connection.config)
                ok = await plugin.test_connection()
                if ok:
                    return ConnectionTestResult(
                        success=True, message=f"Connected to {connection.name}"
                    )
                return ConnectionTestResult(
                    success=False, error=f"Connection to {connection.name} failed"
                )

            return ConnectionTestResult(
                success=False, error=f"No plugin for type '{connection.type}'"
            )

        except Exception as e:
            return ConnectionTestResult(success=False, error=str(e))

    async def get_schema(self, conn_id: int) -> dict[str, object]:
        connection = await self._get_or_404(conn_id)

        if connection.type not in ("sqlserver", "azure_sql", "postgresql", "mysql"):
            raise HTTPException(
                status_code=400, detail="Schema explorer only supports SQL connections"
            )

        from vectis.plugins.registry import registry

        provider_cls = registry.get_provider(connection.type)
        if not provider_cls:
            raise HTTPException(
                status_code=400, detail=f"No provider plugin for type '{connection.type}'"
            )

        provider = provider_cls(connection.config)
        try:
            await provider.connect()

            tables_raw = await provider.discover_tables()

            schemas: dict[str, list[dict[str, object]]] = {}
            for t in tables_raw:
                schema_name = t["table_schema"]
                table_name = t["table_name"]

                cols_raw = await provider.discover_column_details(table_name, schema_name)
                pk_set = await provider.discover_primary_keys(table_name, schema_name)

                # Row count
                try:
                    qualified = provider.qualified_table(table_name, schema_name)
                    count_result = await provider.query(f"SELECT COUNT(*) AS cnt FROM {qualified}")
                    row_count = int(count_result[0]["cnt"]) if count_result else 0
                except Exception:
                    row_count = 0

                # Format columns
                columns = []
                for c in cols_raw:
                    col_name = str(c["column_name"])
                    dtype = str(c["data_type"])
                    max_len = c.get("character_maximum_length")
                    precision = c.get("numeric_precision")
                    scale = c.get("numeric_scale")
                    nullable_val = c.get("is_nullable", "YES")

                    if max_len and int(str(max_len)) > 0 and dtype in ("nvarchar", "varchar", "char", "nchar", "character varying"):
                        type_str = f"{dtype}({max_len})"
                    elif max_len and int(str(max_len)) == -1:
                        type_str = f"{dtype}(MAX)"
                    elif precision and dtype in ("decimal", "numeric"):
                        type_str = f"{dtype}({precision},{scale or 0})"
                    else:
                        type_str = dtype

                    columns.append({"name": col_name, "type": type_str, "nullable": nullable_val == "YES"})

                if schema_name not in schemas:
                    schemas[schema_name] = []
                schemas[schema_name].append({
                    "name": table_name, "schema": schema_name,
                    "columns": columns, "primary_keys": sorted(pk_set), "row_count": row_count,
                })

            # Foreign keys
            fks_raw = await provider.discover_foreign_keys_detailed()
            relationships = [
                {
                    "name": fk["fk_name"],
                    "from_schema": fk["from_schema"],
                    "from_table": fk["from_table"],
                    "from_column": fk["from_column"],
                    "to_schema": fk["to_schema"],
                    "to_table": fk["to_table"],
                    "to_column": fk["to_column"],
                }
                for fk in fks_raw
            ]

            table_count = sum(len(tables) for tables in schemas.values())
            return {
                "success": True,
                "database": connection.name,
                "schemas": schemas,
                "relationships": relationships,
                "table_count": table_count,
                "schema_count": len(schemas),
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e
        finally:
            await provider.disconnect()

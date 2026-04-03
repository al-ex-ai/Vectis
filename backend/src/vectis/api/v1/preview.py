from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user
from vectis.db.engine import get_session
from vectis.models.connection import Connection
from vectis.plugins.registry import registry
from vectis.schemas.preview import PreviewResponse

router = APIRouter(prefix="/preview", tags=["preview"], dependencies=[Depends(get_current_user)])


@router.get("/{conn_id}/{table_name}", response_model=PreviewResponse)
async def preview_table(
    conn_id: int,
    table_name: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> PreviewResponse:
    result = await session.execute(select(Connection).where(Connection.id == conn_id))
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail=f"Connection {conn_id} not found")

    provider_cls = registry.get_provider(connection.type)
    if not provider_cls:
        raise HTTPException(status_code=400, detail=f"No provider for type '{connection.type}'")

    provider = provider_cls(connection.config)
    try:
        await provider.connect()

        if "." in table_name:
            schema, tbl = table_name.rsplit(".", 1)
        else:
            schema = provider.default_schema()
            tbl = table_name

        total = await provider.row_count(tbl, schema)
        total_pages = max(1, (total + page_size - 1) // page_size)

        cols = await provider.list_columns(tbl, schema)
        columns = [str(c.get("column_name", c.get("COLUMN_NAME", ""))) for c in cols]

        offset = (page - 1) * page_size
        rows_result = await provider.preview_rows(tbl, schema, page_size, offset)

        rows: list[dict[str, object]] = []
        for row in rows_result:
            clean: dict[str, object] = {}
            for k, v in row.items():
                if v is None:
                    clean[k] = None
                elif hasattr(v, "isoformat"):
                    clean[k] = v.isoformat()
                else:
                    clean[k] = str(v) if not isinstance(v, (int, float, bool)) else v
            rows.append(clean)

        return PreviewResponse(
            table=table_name, columns=columns, rows=rows,
            total=total, page=page, page_size=page_size, total_pages=total_pages,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        await provider.disconnect()

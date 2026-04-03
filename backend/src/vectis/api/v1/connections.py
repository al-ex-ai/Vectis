from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.user import User
from vectis.schemas.common import SuccessResponse
from vectis.schemas.connections import (
    ConnectionCreate,
    ConnectionResponse,
    ConnectionTestResult,
    ConnectionUpdate,
)
from vectis.services.connection_service import ConnectionService

router = APIRouter(prefix="/connections", tags=["connections"], dependencies=[Depends(get_current_user)])


def _service(session: AsyncSession, user: User) -> ConnectionService:
    return ConnectionService(session, org_id=user.org_id)


@router.get("/", response_model=list[ConnectionResponse])
async def list_connections(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ConnectionResponse]:
    return await _service(session, user).list_all()


@router.post("/", response_model=ConnectionResponse)
async def create_connection(
    data: ConnectionCreate,
    user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> ConnectionResponse:
    return await _service(session, user).create(data, created_by=user.email)


@router.get("/{conn_id}", response_model=ConnectionResponse)
async def get_connection(
    conn_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ConnectionResponse:
    return await _service(session, user).get_by_id(conn_id)


@router.put("/{conn_id}", response_model=ConnectionResponse)
async def update_connection(
    conn_id: int,
    data: ConnectionUpdate,
    user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> ConnectionResponse:
    return await _service(session, user).update(conn_id, data)


@router.get("/{conn_id}/test", response_model=ConnectionTestResult)
async def test_connection(
    conn_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ConnectionTestResult:
    return await _service(session, user).test_connection(conn_id)


@router.get("/{conn_id}/schema")
async def get_schema(
    conn_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    return await _service(session, user).get_schema(conn_id)


@router.delete("/{conn_id}", response_model=SuccessResponse)
async def delete_connection(
    conn_id: int,
    user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse:
    await _service(session, user).delete(conn_id)
    return SuccessResponse()

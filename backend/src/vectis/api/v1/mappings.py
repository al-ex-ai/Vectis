"""Entity mapping CRUD -- add, update, delete field mappings for pipelines."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.user import User
from vectis.schemas.common import SuccessResponse
from vectis.schemas.mappings import MappingCreate, MappingResponse, MappingUpdate
from vectis.services.mapping_service import MappingService

router = APIRouter(prefix="/mappings", tags=["mappings"], dependencies=[Depends(get_current_user)])


async def get_service(session: AsyncSession = Depends(get_session)) -> MappingService:
    return MappingService(session)


@router.post("/", response_model=MappingResponse)
async def create_mapping(
    data: MappingCreate,
    _user: User = Depends(require_editor),
    service: MappingService = Depends(get_service),
) -> MappingResponse:
    return await service.create(data)


@router.put("/{mapping_id}", response_model=SuccessResponse)
async def update_mapping(
    mapping_id: int,
    data: MappingUpdate,
    _user: User = Depends(require_editor),
    service: MappingService = Depends(get_service),
) -> SuccessResponse:
    await service.update(mapping_id, data)
    return SuccessResponse()


@router.delete("/{mapping_id}", response_model=SuccessResponse)
async def delete_mapping(
    mapping_id: int,
    _user: User = Depends(require_editor),
    service: MappingService = Depends(get_service),
) -> SuccessResponse:
    await service.delete(mapping_id)
    return SuccessResponse()

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.user import User
from vectis.schemas.common import SuccessResponse
from vectis.schemas.projects import ProjectCreate, ProjectResponse, ProjectUpdate
from vectis.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(get_current_user)])


def _service(session: AsyncSession, user: User) -> ProjectService:
    return ProjectService(session, org_id=user.org_id)


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectResponse]:
    return await _service(session, user).list_all()


@router.post("/", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    return await _service(session, user).create(data, created_by=user.email)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    return await _service(session, user).get_by_id(project_id)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    return await _service(session, user).update(project_id, data)


@router.delete("/{project_id}", response_model=SuccessResponse)
async def delete_project(
    project_id: int,
    user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse:
    await _service(session, user).delete(project_id)
    return SuccessResponse()

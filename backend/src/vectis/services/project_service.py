from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.pipeline import Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.models.project import Project
from vectis.schemas.projects import ProjectCreate, ProjectResponse, ProjectUpdate


class ProjectService:
    def __init__(self, session: AsyncSession, org_id: int | None = None) -> None:
        self.session = session
        self.org_id = org_id

    async def _get_or_404(self, project_id: int) -> Project:
        stmt = select(Project).where(Project.id == project_id)
        if self.org_id is not None:
            stmt = stmt.where(Project.org_id == self.org_id)
        result = await self.session.execute(stmt)
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
        return project

    async def _enrich(self, project: Project) -> ProjectResponse:
        pipe_count = await self.session.scalar(
            select(func.count()).select_from(Pipeline).where(Pipeline.project_id == project.id)
        )
        active_runs = await self.session.scalar(
            select(func.count())
            .select_from(PipelineRun)
            .join(Pipeline, PipelineRun.pipeline_id == Pipeline.id)
            .where(Pipeline.project_id == project.id, PipelineRun.status == "running")
        )
        data = {
            **ProjectResponse.model_validate(project).model_dump(),
            "pipeline_count": pipe_count or 0,
            "active_runs": active_runs or 0,
        }
        return ProjectResponse(**data)

    async def list_all(self) -> list[ProjectResponse]:
        stmt = select(Project).order_by(Project.created_at.desc())
        if self.org_id is not None:
            stmt = stmt.where(Project.org_id == self.org_id)
        result = await self.session.execute(stmt)
        return [await self._enrich(p) for p in result.scalars().all()]

    async def get_by_id(self, project_id: int) -> ProjectResponse:
        project = await self._get_or_404(project_id)
        return await self._enrich(project)

    async def create(self, data: ProjectCreate, created_by: str = "") -> ProjectResponse:
        project = Project(**data.model_dump(), org_id=self.org_id, created_by=created_by)
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return ProjectResponse.model_validate(project)

    async def update(self, project_id: int, data: ProjectUpdate) -> ProjectResponse:
        project = await self._get_or_404(project_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(project, key, value)
        await self.session.commit()
        await self.session.refresh(project)
        return ProjectResponse.model_validate(project)

    async def delete(self, project_id: int) -> None:
        project = await self._get_or_404(project_id)
        await self.session.delete(project)
        await self.session.commit()

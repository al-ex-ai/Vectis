import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import get_current_user, require_editor
from vectis.db.engine import get_session
from vectis.models.connection import Connection
from vectis.models.pipeline import EntityMapping, Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.models.user import User
from vectis.schemas.pipelines import (
    PipelineCreate,
    PipelineResponse,
    PipelineRunResponse,
    PipelineUpdate,
)
from vectis.services import pipeline_service

router = APIRouter(prefix="/pipelines", tags=["pipelines"], dependencies=[Depends(get_current_user)])


async def _get_pipeline_or_404(pipeline_id: int, session: AsyncSession) -> Pipeline:
    result = await session.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Pipeline {pipeline_id} not found")
    return pipeline


async def _enrich_response(resp: PipelineResponse, pipeline: Pipeline, session: AsyncSession) -> None:
    """Add source/dest connection names to a pipeline response."""
    src = (await session.execute(select(Connection).where(Connection.id == pipeline.source_connection_id))).scalar_one_or_none()
    dst = (await session.execute(select(Connection).where(Connection.id == pipeline.dest_connection_id))).scalar_one_or_none()
    if src:
        resp.source_name = src.name
        resp.source_type = src.type
    if dst:
        resp.dest_name = dst.name
        resp.dest_type = dst.type


@router.get("/", response_model=list[PipelineResponse])
async def list_pipelines(
    project_id: int | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> list[PipelineResponse]:
    stmt = select(Pipeline).order_by(Pipeline.created_at.desc())
    if project_id is not None:
        stmt = stmt.where(Pipeline.project_id == project_id)
    result = await session.execute(stmt)
    responses = []
    for p in result.scalars().all():
        resp = PipelineResponse.model_validate(p)
        await _enrich_response(resp, p, session)
        responses.append(resp)
    return responses


@router.post("/", response_model=PipelineResponse)
async def create_pipeline(
    data: PipelineCreate,
    _user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> PipelineResponse:
    pipeline = Pipeline(**data.model_dump())
    session.add(pipeline)
    await session.commit()
    await session.refresh(pipeline)
    return PipelineResponse.model_validate(pipeline)


@router.get("/{pipeline_id}")
async def get_pipeline(
    pipeline_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    resp = PipelineResponse.model_validate(pipeline)
    await _enrich_response(resp, pipeline, session)

    mappings_result = await session.execute(
        select(EntityMapping).where(EntityMapping.pipeline_id == pipeline_id).order_by(EntityMapping.sort_order)
    )
    mappings = [
        {
            "id": m.id, "pipeline_id": m.pipeline_id, "source_entity": m.source_entity,
            "dest_table": m.dest_table, "mapping_config": m.mapping_config,
            "transform_type": m.transform_type, "sort_order": m.sort_order,
            "created_at": m.created_at.isoformat(),
        }
        for m in mappings_result.scalars().all()
    ]
    return {"pipeline": resp.model_dump(), "mappings": mappings}


@router.put("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: int,
    data: PipelineUpdate,
    _user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> PipelineResponse:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pipeline, key, value)
    await session.commit()
    await session.refresh(pipeline)
    return PipelineResponse.model_validate(pipeline)


@router.get("/{pipeline_id}/runs", response_model=list[PipelineRunResponse])
async def list_pipeline_runs(
    pipeline_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[PipelineRunResponse]:
    result = await session.execute(
        select(PipelineRun)
        .where(PipelineRun.pipeline_id == pipeline_id)
        .order_by(PipelineRun.started_at.desc())
    )
    return [PipelineRunResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/{pipeline_id}/mappings")
async def add_pipeline_mapping(
    pipeline_id: int,
    data: dict[str, object],
    _user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    mapping = EntityMapping(
        pipeline_id=pipeline_id,
        source_entity=str(data.get("source_entity", "")),
        dest_table=str(data.get("dest_table", "")),
        mapping_config=str(data.get("mapping_config", "{}")),
        transform_type=str(data.get("transform_type", "direct")),
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)
    return {"success": True, "id": mapping.id}


@router.post("/{pipeline_id}/run")
async def run_pipeline(
    pipeline_id: int,
    _user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    return await pipeline_service.start_run(pipeline, session)


@router.post("/{pipeline_id}/validate")
async def validate_pipeline(
    pipeline_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    return await pipeline_service.validate(pipeline, session)


@router.get("/{pipeline_id}/discover")
async def discover_entities(
    pipeline_id: int,
    side: str = "source",
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    return await pipeline_service.discover_entities(pipeline, side, session)


@router.get("/{pipeline_id}/discover/{entity_name}")
async def discover_entity_attributes(
    pipeline_id: int,
    entity_name: str,
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    return await pipeline_service.discover_attributes(pipeline, entity_name, session)


@router.put("/{pipeline_id}/settings")
async def update_pipeline_settings(
    pipeline_id: int,
    data: dict[str, object],
    _user: User = Depends(require_editor),
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    pipeline = await _get_pipeline_or_404(pipeline_id, session)
    pipeline.settings = json.dumps(data)  # type: ignore[assignment]
    await session.commit()
    return {"success": True}

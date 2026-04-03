from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.pipeline import EntityMapping
from vectis.schemas.mappings import MappingCreate, MappingResponse, MappingUpdate


class MappingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _get_or_404(self, mapping_id: int) -> EntityMapping:
        result = await self.session.execute(
            select(EntityMapping).where(EntityMapping.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        if not mapping:
            raise HTTPException(status_code=404, detail=f"Mapping {mapping_id} not found")
        return mapping

    async def create(self, data: MappingCreate) -> MappingResponse:
        mapping = EntityMapping(**data.model_dump())
        self.session.add(mapping)
        await self.session.commit()
        await self.session.refresh(mapping)
        return MappingResponse(
            id=mapping.id,
            source_entity=mapping.source_entity,
            dest_table=mapping.dest_table,
        )

    async def update(self, mapping_id: int, data: MappingUpdate) -> None:
        mapping = await self._get_or_404(mapping_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(mapping, key, value)
        await self.session.commit()

    async def delete(self, mapping_id: int) -> None:
        mapping = await self._get_or_404(mapping_id)
        await self.session.delete(mapping)
        await self.session.commit()

from pydantic import BaseModel


class MappingCreate(BaseModel):
    pipeline_id: int
    source_entity: str
    dest_table: str
    mapping_config: str = "{}"
    transform_type: str = "direct"
    sort_order: int = 0


class MappingUpdate(BaseModel):
    dest_table: str | None = None
    mapping_config: str | None = None
    transform_type: str | None = None
    sort_order: int | None = None


class MappingResponse(BaseModel):
    success: bool = True
    id: int
    source_entity: str = ""
    dest_table: str = ""

import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class PipelineBase(BaseModel):
    name: str
    description: str = ""
    source_connection_id: int
    dest_connection_id: int
    project_id: int | None = None


class PipelineCreate(PipelineBase):
    tags: list[str] = []
    settings: dict[str, object] | None = None


class PipelineUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    settings: dict[str, object] | None = None


class PipelineResponse(PipelineBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    tags: list[str]

    @field_validator("tags", mode="before")
    @classmethod
    def _parse_tags(cls, v: object) -> list[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []
        if isinstance(v, list):
            return v
        return []
    source_name: str | None = None
    source_type: str | None = None
    dest_name: str | None = None
    dest_type: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


class PipelineRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pipeline_id: int
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    total_records: int
    processed_records: int
    failed_records: int
    batch_size: int
    error_message: str | None = None
    started_by: str

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FlowCreate(BaseModel):
    name: str
    description: str = ""
    project_id: int | None = None
    steps: list[dict[str, object]] = []


class FlowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    steps: list[dict[str, object]] | None = None


class FlowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None = None
    name: str
    description: str
    status: str = "active"
    steps: list[dict[str, object]] = []
    created_at: datetime


class FlowRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    flow_id: int
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    total_steps: int = 0
    completed_steps: int = 0
    failed_steps: int = 0
    step_results: dict[str, object] = {}
    error_message: str | None = None

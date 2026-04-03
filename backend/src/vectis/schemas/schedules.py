from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScheduleBase(BaseModel):
    name: str
    description: str = ""
    target_type: str  # "pipeline" or "flow"
    pipeline_id: int | None = None
    flow_id: int | None = None
    project_id: int | None = None
    cron_expression: str
    timezone: str = "UTC"
    enabled: bool = True
    overlap_policy: str = "skip"


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cron_expression: str | None = None
    timezone: str | None = None
    enabled: bool | None = None
    overlap_policy: str | None = None


class ScheduleResponse(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_run_at: datetime | None = None
    last_status: str | None = None
    next_run_at: datetime | None = None
    run_count: int = 0
    pipeline_name: str | None = None
    flow_name: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

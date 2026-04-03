from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RunListItem(BaseModel):
    id: int
    pipeline_id: int
    pipeline_name: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    total_records: int = 0
    processed_records: int = 0
    failed_records: int = 0
    batch_size: int = 1000
    error_message: str | None = None


class RunListResponse(BaseModel):
    runs: list[RunListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class TransferLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_mapping_id: int
    source_entity: str
    dest_table: str
    source_id: str
    status: str
    batch_number: int
    error_detail: str | None = None
    transferred_at: datetime


class RunDetailItem(BaseModel):
    id: int
    pipeline_id: int
    pipeline_name: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    total_records: int = 0
    processed_records: int = 0
    failed_records: int = 0
    batch_size: int = 1000
    error_message: str | None = None
    dest_connection_id: int | None = None


class RunDetailResponse(BaseModel):
    run: RunDetailItem
    logs: list[TransferLogEntry]

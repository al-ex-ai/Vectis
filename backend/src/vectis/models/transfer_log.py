from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vectis.db.engine import Base

if TYPE_CHECKING:
    from vectis.models.pipeline_run import PipelineRun


class TransferLog(Base):
    __tablename__ = "transfer_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("pipeline_runs.id"))
    entity_mapping_id: Mapped[int] = mapped_column(Integer, default=0)
    source_entity: Mapped[str] = mapped_column(String(255), default="")
    dest_table: Mapped[str] = mapped_column(String(255), default="")
    source_id: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(50), default="transferred")
    batch_number: Mapped[int] = mapped_column(Integer, default=1)
    error_detail: Mapped[str | None] = mapped_column(Text, default=None)
    transferred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    run: Mapped[PipelineRun] = relationship(foreign_keys=[run_id])

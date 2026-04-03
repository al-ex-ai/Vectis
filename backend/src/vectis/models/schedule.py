from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vectis.db.engine import Base

if TYPE_CHECKING:
    from vectis.models.flow import Flow
    from vectis.models.pipeline import Pipeline
    from vectis.models.project import Project


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    target_type: Mapped[str] = mapped_column(String(50))  # "pipeline" or "flow"
    pipeline_id: Mapped[int | None] = mapped_column(ForeignKey("pipelines.id"), default=None)
    flow_id: Mapped[int | None] = mapped_column(ForeignKey("flows.id"), default=None)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), default=None)
    cron_expression: Mapped[str] = mapped_column(String(100))
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    overlap_policy: Mapped[str] = mapped_column(String(20), default="skip")  # skip | queue | allow
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_status: Mapped[str | None] = mapped_column(String(50), default=None)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    run_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None, onupdate=lambda: datetime.now(UTC))

    pipeline: Mapped[Pipeline | None] = relationship(foreign_keys=[pipeline_id])
    flow: Mapped[Flow | None] = relationship(foreign_keys=[flow_id])
    project: Mapped[Project | None] = relationship(foreign_keys=[project_id])

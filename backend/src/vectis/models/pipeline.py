from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from vectis.db.engine import Base

if TYPE_CHECKING:
    from vectis.models.connection import Connection
    from vectis.models.project import Project


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    source_connection_id: Mapped[int] = mapped_column(ForeignKey("connections.id"))
    dest_connection_id: Mapped[int] = mapped_column(ForeignKey("connections.id"))
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), default=None)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    config: Mapped[dict[str, str] | None] = mapped_column(JSON, default=None)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    settings: Mapped[dict[str, str] | None] = mapped_column(JSON, default=None)
    created_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None, onupdate=lambda: datetime.now(UTC))

    source_connection: Mapped[Connection] = relationship(foreign_keys=[source_connection_id])
    dest_connection: Mapped[Connection] = relationship(foreign_keys=[dest_connection_id])
    project: Mapped[Project | None] = relationship(foreign_keys=[project_id])


class EntityMapping(Base):
    __tablename__ = "entity_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_id: Mapped[int] = mapped_column(ForeignKey("pipelines.id"))
    source_entity: Mapped[str] = mapped_column(String(255))
    dest_table: Mapped[str] = mapped_column(String(255))
    mapping_config: Mapped[str] = mapped_column(Text, default="{}")
    transform_type: Mapped[str] = mapped_column(String(50), default="direct")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    pipeline: Mapped[Pipeline] = relationship(foreign_keys=[pipeline_id])

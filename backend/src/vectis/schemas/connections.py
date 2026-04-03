from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConnectionBase(BaseModel):
    name: str
    type: str
    description: str = ""


class ConnectionCreate(ConnectionBase):
    config: dict[str, str] = {}


class ConnectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    config: dict[str, str] | None = None


class ConnectionResponse(ConnectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    config: dict[str, str] = {}
    created_at: datetime


class ConnectionTestResult(BaseModel):
    success: bool
    message: str = ""
    error: str | None = None
